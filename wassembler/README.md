# WASM Assembler

This is a quick and dirty prototype for turning a textual language into JS and/or bytecode.

## Running in the Browser

`./tools/httpd.py` will serve the current directory at http://localhost:7777/

## Running on the Command Line

[Get V8.](https://code.google.com/p/v8-wiki/wiki/UsingGit)

[Patch V8.](https://github.com/WebAssembly/v8-native-prototype)

`path/to/patched/d8 d8_main.js -- demos/simple.wasm`

## Design

### Goals

* Human-understandable text can be recovered from bytecode.
* A complete program can be specified in a single file.

### Non-goals

* Hand writing large amounts of textual WASM.
* Inline assembly.  Textual WASM can be compiled and linked into a C program, instead.

### Compiler Pipeline

parse => semantic pass => desugar => backend

* parse: translate the textual format into an AST.
* semantic pass: resolve names and check types.
* desugar: convert user-friendly “sugar” into concepts that can be directly represented in the bytecode.  For example converting i8 types into i32 types.
* backend: generate JS or bytecode.

## Design Notes

### Indirect Function Calls

Indirect function calls are strange because there are no pointer types.  The callsite must declare the function signature.

TODO: how is the value of a function pointer determined?  It should likely be symbolic in the bytecode, to maximize implementation flexibility.  On the other hand, this means function pointers could have implementation-defined values and there would need to be some sort of "relocation" information for memory, even when statically linking.  On the other hand, dynamic linking would be complicated if function pointers had fixed values.  There are many design tradeoffs, here.

TODO: should JS be able to invoke function pointers?  How?

TODO: what datatype is a function pointer?  What if memory pointers are 64 bit?

### Unsigned Types

There is currently no distinction between signed and unsigned types.  Sign-sensitive binary operations (div/mod/compare) will require two textual variants (TBD).

It may be possible to make signedness distinctions in the FFI boundary, otherwise JS will need to `arg>>>0` every value it wishes to be unsigned.

Adding unsigned types would be complicated because LLVM does not make a distinction between signed and unsigned types in its IR.

### Small Integer Types

There is currently no direct support for i8 and i16 types.

TODO: what's the size and performance cost of emulating i8 operations in terms of i32?

TODO: what does emulating i8 and i16 types buy if we already need to support i32, i64, f16?, f32, f64, and several SIMD types?

TODO: does this cause an impediance mismatch with small integer SIMD types?

### Hiding Implementation Details

This prototype does not expose the heap to JS as an array buffer - instead it uses methods on the WASM module instance, such as `_copyOut`, to do bulk data transfer.  The upside is that it is easier for the WASM heap to behave as if it were not an array buffer - unmapped memory pages, for example.  The downside is that fine-grained interactions with the heap, such as traversing pointer-based datastructures, are more expensive from JS.  This interface also works best when data sizes are known apriori - JS should explicitly be given the length of null terminated strings, rather than calculating the string's length itself, for example.

TODO: is this the correct tradeoff?

### FFI Binding

Generally, non-trivial FFI calls will need to know which WASM module instance they are being invoked on behalf of.  FFI calls will need to copy data in and out of the instance's memory space, keep a lookup table of JS objects assosiated with a particular instance, etc.  Historically, asm.js bound FFI functions to an instance using closures.  Threaded applications are more complicated, however, because FFI functions must be bound to the instance for each thread / JS isolate.  How the FFI functions get loaded into each isolate and how they are bound TBD.

Currently this prototype binds the WASM module instance to "this" for all FFI calls.


## Things to Investigate

* FFI / system interface design.
* Shared memory and threads.
* Goto / CFG support.
* Dynamic linking.
* SIMD.
* 64-bit pointers.
