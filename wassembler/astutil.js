define([], function() {
  var makeASTBuilder = function(config) {
    var exports = {};
    for (var i in config) {
      var decl = config[i];
      if (decl.name in exports) {
        throw Error("Attempted to redefine " + decl.name);
      }

      decl.fieldIndex = {};
      for (var i in decl.fields) {
        var field = decl.fields[i];
        if (field.name in decl.fieldIndex) {
          throw Error("Attempted to redefine " + decl.name + "." + field.name);
        }
        decl.fieldIndex[field.name] = field;
      }

      exports[decl.name] = (function(decl) {
        return function(args){
          for (var name in args) {
            if (!(name in decl.fieldIndex)) {
              throw Error("Unknown AST field: " + decl.name + "." + name);
            }
          }
          var node = {type: decl.name};
          for (var i in decl.fields) {
            var field = decl.fields[i];
            var value = args[field.name];
            if (value === undefined) {
              value = field.defaultValue;
            }
            if (value === undefined) {
              throw Error("Undefined AST field: " + decl.name + "." + field.name);
            }
            node[field.name] = value;
          }
          return node;
        }
      })(decl);
    }
    return exports;
  };

  var index = function(keynames, table, rowfilter, rowrewrite) {
    var finalkeyname = keynames.pop();
    var out = {};
    nextrow: for (var i = 0; i < table.length; i++) {
      var row = table[i];
      if (rowfilter && !rowfilter(row)) continue nextrow;
      var current = out;
      for (var j = 0; j < keynames.length; j++) {
        var key = row[keynames[j]];
        if (key === undefined) throw Error("bad key " + keynames[j] + "?");
        if (key === null) continue nextrow;
        if (!(key in current)) {
          current[key] = {};
        }
        current = current[key];
      }
      var key = row[finalkeyname];
      if (key === undefined) throw Error("bad key " + finalkeyname + "?");
      if (key === null) continue nextrow;
      if (key in current) throw Error("tried to redefine " + key + " @" + i);
      if (rowrewrite) {
        row = rowrewrite(row);
      }
      current[key] = row;
    }
    return out;
  };

  return {
    makeASTBuilder: makeASTBuilder,
    index: index,
  };
});
