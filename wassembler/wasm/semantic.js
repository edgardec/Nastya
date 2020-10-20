define(["compilerutil", "wasm/ast", "wasm/typeinfo", "wasm/opinfo"], function(compilerutil, wast, typeinfo, opinfo) {

  var configDefaults = {
    memory: {
      fixed: 65536,
    },
  };

  var setConfigDefaults = function(config, defaults) {
    for (var name in defaults) {
      if (typeof defaults[name] === "object") {
        if (!(name in config)) {
          config[name] = {};
        }
        setConfigDefaults(config[name], defaults[name]);
      } else {
        if (!(name in config)) {
          config[name] = defaults[name];
        }
      }
    }
  };

  var getPos = function(node) {
    switch (node.type) {
    case "Call":
      return getPos(node.expr);
    case "BinaryOp":
      return getPos(node.left);
    case "GetName":
      return node.name.pos;
    case "SetName":
      return node.name.pos;
    default:
      if (node.pos) {
        return node.pos;
      }
      throw Error(node.type);
    }
  };

  var isLoop = function(node) {
    return node.type == "While" || node.type == "Loop";
  };

  var SemanticPass = function(status) {
    this.status = status;
  };

  SemanticPass.prototype.error = function(message, pos) {
    this.status.error(message, pos);
    this.dead = true;
  };

  SemanticPass.prototype.setExprType = function(expr, t) {
    if(typeof t != "string") {
      console.log(Error(t));
      throw t;
    }
    expr.etype = t;
  };

  SemanticPass.prototype.checkCall = function(expr, ft) {
    if (expr.args.length != ft.paramTypes.length) {
      this.error("argument count mismatch - got " + expr.args.length + ", but expected " + ft.paramTypes.length, getPos(expr));
    } else {
      for (var i = 0; i < expr.args.length; i++) {
        var arg = expr.args[i];
        var expected = ft.paramTypes[i];
        if (arg.etype != expected) {
          this.error("arg " + i + " - got " + arg.etype + ", but expected " + expected, getPos(arg));
        }
      }
    }
  };

  SemanticPass.prototype.processExpr = function(expr) {
    var old_dead = this.dead;
    this.dead = false;

    switch(expr.type) {
    case "ConstI32":
      this.setExprType(expr, "i32");
      expr.etype = "i32";
      break;
    case "ConstF32":
      this.setExprType(expr, "f32");
      break;
    case "ConstF64":
      this.setExprType(expr, "f64");
      break;
    case "GetName":
      var name = expr.name.text;
      var ref = this.localScope[name];
      if (ref !== undefined) {
        var expr = wast.GetLocal({local: ref, pos: getPos(expr)});
        this.setExprType(expr, ref.ltype);
        break;
      }

      var ref = this.moduleScope[name];
      if (ref !== undefined) {
        switch(ref.type) {
        case "Function":
          expr = wast.GetFunction({func: ref, pos: getPos(expr)});
          this.setExprType(expr, "i32");
          break;
        case "Extern":
          expr = wast.GetExtern({func: ref, pos: getPos(expr)});
          this.setExprType(expr, "i32");
          break;
        case "Intrinsic":
          expr = wast.GetIntrinsic({func: ref, pos: getPos(expr)});
          this.setExprType(expr, "i32");
          break;
        case "TlsDecl":
          expr = wast.GetTls({tls: ref, pos: getPos(expr)});
          this.setExprType(expr, ref.mtype);
          break;
        case "MemoryLabel":
          expr = wast.ConstI32({
            value: ref.ptr,
            pos: getPos(expr),
          });
          this.setExprType(expr, "i32");
          break;
        default:
          throw Error(ref.type);
        }
        break;
      }
      this.error("cannot resolve name - " + name, expr.name.pos);
      break;
    case "SetName":
      var name = expr.name.text;
      var ref = this.localScope[name];
      if (ref !== undefined) {
        expr = wast.SetLocal({
          local: ref,
          value: this.processExpr(expr.value),
          pos: getPos(expr),
        });
        this.setExprType(expr, "void");
        break;
      }
      var ref = this.moduleScope[name];
      if (ref !== undefined) {
        switch(ref.type) {
        case "TlsDecl":
          expr = wast.SetTls({
            tls: ref,
            value: this.processExpr(expr.value),
            pos: getPos(expr),
          });
          this.setExprType(expr, "void");
          break;
        default:
          this.error("cannot assign to name - " + name, expr.name.pos);
        }
        break;
      }
      this.error("assigning to unknown name - " + name, expr.name.pos);
      break;
    case "Load":
      expr.address = this.processExpr(expr.address);
      // TODO type check
      this.setExprType(expr, expr.mtype);
      break;
    case "Store":
      expr.address = this.processExpr(expr.address);
      expr.value = this.processExpr(expr.value);
      // TODO type check
      this.setExprType(expr, expr.mtype);
      break;
    case "Coerce":
      expr.expr = this.processExpr(expr.expr);
      // TODO type check
      this.setExprType(expr, expr.mtype);
      break;
    case "PrefixOp":
      expr.expr = this.processExpr(expr.expr);
      var opText = expr.op;
      var types = opinfo.classifyPrefixOp[opText];
      if (types === undefined) {
        this.error("unknown prefix operator " + opText, expr.pos);
      }
      if (this.dead) {
        break;
      }
      var t = expr.expr.etype;
      var decl = types[t];
      if (decl === undefined) {
        this.error("prefix operator " + opText + " does not support type " + t, expr.pos);
      }
      if (this.dead) {
        break;
      }
      expr = wast.UnaryOp({
        optype: t,
        op: decl.op,
        expr: expr.expr,
      })
      this.setExprType(expr, decl.result);
      break;
    case "InfixOp":
      expr.left = this.processExpr(expr.left);
      expr.right = this.processExpr(expr.right);
      var opText = expr.op.text;
      var types = opinfo.classifyBinaryOp[opText];
      if (types === undefined) {
        this.error("unknown binary operator " + opText, expr.op.pos);
      }
      if (this.dead) {
        break;
      }
      var t = expr.left.etype;
      var decl = types[t];
      if (decl === undefined) {
        this.error("binary operator " + opText + " does not support type " + t, expr.op.pos);
      }
      if (this.dead) {
        break;
      }
      if (t != expr.right.etype) {
        this.error("binary op type error " + t + opText + expr.right.etype + " = ???", expr.op.pos);
      }
      if (this.dead) {
        break;
      }
      expr = wast.BinaryOp({
        optype: t,
        op: decl.op,
        left: expr.left,
        right: expr.right,
      })
      this.setExprType(expr, decl.result);
      break;
    case "Call":
      // Process children
      expr.expr = this.processExpr(expr.expr);
      for (var i = 0; i < expr.args.length; i++) {
        expr.args[i] = this.processExpr(expr.args[i]);
      }

      var args = expr.args;
      var ft = null;

      if (!this.dead) {
        switch (expr.expr.type) {
        case "GetFunction":
          var func = expr.expr.func;
          ft = func.funcType;
          this.checkCall(expr, ft);
          if (!this.dead) {
            expr = wast.CallDirect({
              func: func,
              args: expr.args,
              pos: getPos(expr),
            });
            this.setExprType(expr, ft.returnType);
          }
          break;
        case "GetExtern":
          var func = expr.expr.func;
          ft = func.ftype;
          this.checkCall(expr, ft);
          if (!this.dead) {
            expr = wast.CallExternal({
              func: func,
              args: expr.args,
              pos: getPos(expr),
            });
            this.setExprType(expr, ft.returnType);
          }
          break;
        case "GetIntrinsic":
          var func = expr.expr.func;
          ft = func.funcType;
          this.checkCall(expr, ft);
          if (!this.dead) {
            var op = func.op;
            switch (op.type) {
            case "unary":
              expr = wast.UnaryOp({
                optype: op.optype,
                op: op.op,
                expr: expr.args[0],
              });
              break;
            case "binary":
              expr = wast.BinaryOp({
                optype: op.optype,
                op: op.op,
                left: expr.args[0],
                right: expr.args[1],
              });
              break;
            default:
              throw Error(op.type);
            }
            this.setExprType(expr, ft.returnType);
          }
          break;
        default:
          throw Error(expr.expr.type);
        }
      }
      break;

    case "CallIndirect":
      expr.ftype = this.processFunctionType(expr.ftype);
      expr.expr = this.processExpr(expr.expr);
      if (!this.dead && expr.expr.etype != "i32") {
        this.error("type mismatch - " + expr.expr.etype + ", expected i32", getPos(expr.expr));
      }
      for (var i = 0; i < expr.args.length; i++) {
        expr.args[i] = this.processExpr(expr.args[i]);
      }
      this.setExprType(expr, expr.ftype.returnType);
      this.checkCall(expr, expr.ftype);
      break;

    case "Return":
      var actual = "void";
      if (expr.expr) {
        expr.expr = this.processExpr(expr.expr);
        actual = expr.expr.etype;
      }
      if (!this.dead && actual != this.func.returnType) {
        this.error("return type mismatch - " + actual + " vs. " + this.func.returnType, getPos(expr));
      }
      this.setExprType(expr, "void");
      break;
    case "If":
      expr.cond = this.processExpr(expr.cond);
      if (!this.dead && expr.cond.etype != "i32") {
        this.error("condition type mismatch - " + expr.cond.etype + ", expected i32", getPos(expr));
      }

      expr.t = this.processBlock(expr.t);
      if (expr.f != null) {
        expr.f = this.processBlock(expr.f);
      }
      this.setExprType(expr, "void");
      break;
    case "While":
      expr.cond = this.processExpr(expr.cond);
      if (!this.dead && expr.cond.etype != "i32") {
        this.error("condition type mismatch - " + expr.cond.etype + ", expected i32", getPos(expr));
      }
      expr.body = this.processBlock(expr.body);
      this.setExprType(expr, "void");
      break;
    case "Loop":
      expr.body = this.processBlock(expr.body);
      this.setExprType(expr, "void");
      break;
    default:
      throw Error(expr.type);
    }

    this.dead = this.dead || old_dead;
    return expr;
  };

  SemanticPass.prototype.processType = function(node) {
    switch (node.type) {
    case "TypeName":
      var t = node.name.text;
      switch (t) {
      case "i8":
      case "i16":
      case "i32":
      case "i64":
      case "f32":
      case "f64":
      case "void":
        break;
      default:
        this.error("unknown type name - " + type.text, type.pos);
      }
      return t;
    default:
      throw Error(node.type);
    }
  };

  SemanticPass.prototype.createLocal = function(name, type) {
    if (typeof name !== "string") {
      throw Error(name);
    }
    if (typeof type !== "string") {
      throw Error(type);
    }

    if (name in this.localScope) {
      this.error("attemped to redeclare " + name);
      return -1;
    }

    var lcl = wast.Local({
      name: name,
      ltype: type,
      index: this.func.locals.length
    });
    this.func.locals.push(lcl);
    this.localScope[name] = lcl;
    return lcl;
  };

  SemanticPass.prototype.processStmt = function(node, block) {
    var old_dead = this.dead;
    this.dead = false;

    switch (node.type) {
    case "VarDecl":
      var t = this.processType(node.vtype);
      var lcl = this.createLocal(node.name.text, t);
      if (node.value) {
        var pos = getPos(node);
        var value = this.processExpr(node.value);
        if (!this.dead) {
          if (t != value.etype) {
            this.error("expected " + t + ", got " + value.etype, pos);
          }
          node = wast.SetLocal({
            local: lcl,
            value: value,
            pos: pos,
          });
        }
        this.setExprType(node, "void");
        block.push(node);
      }
      break;
    case "BreakToLabel":
      var name = node.name.text
      var labelInfo = this.labelScope[name];
      if (labelInfo.poisoned) {
        // We aren't 100% sure what the user indended, so don't print additional
        // errors.
        this.dead = true;
      } else {
        if (labelInfo) {
          if (labelInfo.live) {
            var diff = this.depth - labelInfo.depth;
            // Break 0 breaks out of the current block. This difference in depth
            // between a break statement and the enclosing block will be 1, so
            // subtract 1 from the depth difference to get the correct encoding.
            node = wast.Break({depth: diff - 1});
          } else {
            // "live" is true only while processing the subtree contained by the
            // label.  If live is false, this means the break statement is
            // trying to transfer control to a label that is not a ancestor of
            // the break statement, and this is illegal.
            this.error("label " + name + " does not contain break statement", node.name.pos);
          }
        } else {
          this.error("unknown label " + name, node.name.pos);
        }
      }
      block.push(node);
      break;
    case "Label":
      var name = node.name.text;
      var labelInfo = this.labelScope[name];
      if (labelInfo) {
        this.error("attempted to redeclare " + name, node.name.pos);
        labelInfo.poisoned = true;
      } else {
        labelInfo = {name: name, depth: this.depth, live: true, poisoned: false, loop: isLoop(node.stmt)};
        this.labelScope[name] = labelInfo;
      }
      this.processStmt(node.stmt, block);
      if (labelInfo) {
        labelInfo.live = false;
      }
      break;
    default:
      block.push(this.processExpr(node));
    }
    this.dead |= old_dead;
  };

  SemanticPass.prototype.processBlock = function(block) {
    if (block === null) {
      return block;
    }
    var old_dead = this.dead;
    var out = [];
    this.depth += 1;
    for (var i in block) {
      this.processStmt(block[i], out);
    }
    this.depth -= 1;
    this.dead = this.dead || old_dead;
    return out;
  };

  SemanticPass.prototype.processFunction = function(func) {
    this.func = func;
    this.localScope = {};
    this.labelScope = {};
    this.depth = 0;
    this.dead = false;

    for (var i in func.params) {
      var p = func.params[i];
      p.local = this.createLocal(p.name.text, p.ptype);
    }
    func.body = this.processBlock(func.body);
  };

  SemanticPass.prototype.processFunctionType = function(node) {
    for (var i = 0; i < node.paramTypes.length; i++) {
      node.paramTypes[i] = this.processType(node.paramTypes[i]);
    }
    node.returnType = this.processType(node.returnType);
    return node;
  };

  SemanticPass.prototype.processExternSig = function(extern) {
    extern.ftype = this.processFunctionType(extern.ftype);
  };

  SemanticPass.prototype.processFuncSig = function(func) {
    var paramTypes = [];
    for (var i in func.params) {
      var p = func.params[i];
      p.ptype = this.processType(p.ptype);
      paramTypes.push(p.ptype);
    }
    func.returnType = this.processType(func.returnType);
    func.funcType = wast.FuncType({paramTypes: paramTypes, returnType: func.returnType});
  };

  SemanticPass.prototype.processTlsDecl = function(node) {
    node.mtype = this.processType(node.mtype);
  };

  SemanticPass.prototype.registerInModule = function(name, decl) {
    if (name.text in this.moduleScope) {
      this.error("attempted to redefine name - " + name.text, name.pos);
    } else {
      this.moduleScope[name.text] = decl;
    }
  };

  SemanticPass.prototype.indexMemoryDecl = function(node) {
    var base = this.ptr;
    node.ptr = base;

    var writer = new compilerutil.BinaryWriter();
    for (var d = 0; d < node.directives.length; d++) {
      var m = node.directives[d];
      m.ptr = base + writer.pos;
      switch(m.type) {
      case "MemoryAlign":
        var offset = this.ptr % m.size;
        if (offset != 0) {
          var padding = m.size - offset;
          writer.zeros(padding);
        }
        break;
      case "MemoryLabel":
        this.registerInModule(m.name, m);
        break;
      case "MemoryZero":
        writer.zeros(m.size);
        break;
      case "MemoryHex":
        writer.expect(m.data.length);
        for (var i = 0; i < m.data.length; i++) {
          writer.u8(m.data[i]);
        }
        break;
      default:
        throw Error(m.type);
      }
    }
    this.ptr = base + writer.pos;
    node.buffer = writer.getOutput();
  };

  SemanticPass.prototype.indexIntrinsics = function() {
    for (var name in opinfo.classifyUnaryIntrinsic) {
      var op = opinfo.classifyUnaryIntrinsic[name];
      var decl = {
        type: "Intrinsic",
        op: op,
        funcType: wast.FuncType({
          paramTypes: [op.optype],
          returnType: op.result,
        }),
      };
      this.registerInModule({text: op.intrinsicName, pos: null}, decl);
    }
    for (var name in opinfo.classifyBinaryIntrinsic) {
      var op = opinfo.classifyBinaryIntrinsic[name];
      var decl = {
        type: "Intrinsic",
        op: op,
        funcType: wast.FuncType({
          paramTypes: [op.optype, op.right],
          returnType: op.result,
        }),
      };
      this.registerInModule({text: op.intrinsicName, pos: null}, decl);
    }
  };

  SemanticPass.prototype.indexModule = function(module) {
    for (var i = 0; i < module.externs.length; i++) {
      var e = module.externs[i];
      e.index = i;
      this.registerInModule(e.name, e);
      this.processExternSig(e);
    }
    for (var i = 0; i < module.funcs.length; i++) {
      var func = module.funcs[i];
      func.index = i;
      this.processFuncSig(func);
      this.registerInModule(func.name, func);
    }

    // Zero is null, so don't use that.
    this.ptr = 8;
    for (var i in module.memory) {
      this.indexMemoryDecl(module.memory[i]);
    }

    // Create label for the end of pre-reserved memory.
    var m = wast.MemoryLabel({
      name: wast.Identifier({
        text: "_end",
        pos: null,
      })
    });
    m.ptr = this.ptr;
    this.registerInModule(m.name, m);

    for (var i = 0; i < module.tls.length; i++) {
      var v = module.tls[i];
      v.index = i;
      this.registerInModule(v.name, v);
      this.processTlsDecl(v);
    }
  };

  SemanticPass.prototype.evalConstExpr = function(node) {
    switch (node.type) {
    case "ConstI32":
      return node.value;
    default:
      throw Error(node.type);
    }
  };

  SemanticPass.prototype.processModule = function(module) {
    if (module.type != "ParsedModule") {
      console.log(module);
      throw module.type;
    }

    // Bucket the declarations.
    var externs = [];
    var funcs = [];
    var memory = [];
    var tls = [];

    var config = {};

    for (var i in module.decls) {
      var decl = module.decls[i];
      switch (decl.type) {
      case "Function":
        funcs.push(decl);
        break;
      case "Extern":
        externs.push(decl);
        break;
      case "MemoryDecl":
        memory.push(decl);
        break;
      case "ConfigDecl":
        for (var i = 0; i < decl.items.length; i++) {
          var item = decl.items[i];
          var current = config;
          for (var p = 0; p < item.path.length - 1; p++) {
            var name = item.path[p];
            if (!(name in current)) {
              current[name] = {};
            }
            current = current[name];
          }
          current[item.path[item.path.length - 1]] = this.evalConstExpr(item.value);
        }
        break;
      case "TlsDecl":
        tls.push(decl);
        break;
      default:
        console.log(decl);
        throw decl.type;
      }
    }

    setConfigDefaults(config, configDefaults);

    module = wast.Module({
      config: config,
      externs: externs,
      funcs: funcs,
      tls: tls,
      memory: memory,
      top: 0,
    });

    this.module = module;
    this.moduleScope = {};
    this.indexIntrinsics();
    this.indexModule(module);
    if (!this.dead) {
      for (var i in module.funcs) {
        this.processFunction(module.funcs[i]);
      }
    }
    module.top = this.ptr;
    return module;
  };

  var processModule = function(module, status) {
    var semantic = new SemanticPass(status);
    return semantic.processModule(module);
  };

  return {
    processModule: processModule,
  };

});
