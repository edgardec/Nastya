(module

  ;; *** Linear memory
  (memory $mem 1)
  

  ;; *** Cosine table at address 10000
  (data
    (i32.const 10000)
    "\40\3f\3f\3f\3f\3f\3f\3f\3f\3f\3f\3e\3e\3e\3e\3d\3d\3d\3c\3c\3c\3b\3b\3b\3a\3a\39\39\38\38\37\37\36\36\35\34\34\33\33\32\31\31\30\2f\2f\2e\2d\2c\2c\2b\2a\2a\29\28\27\27\26\25\24\23\23\22\21\20\20\1f\1e\1d\1c\1c\1b\1a\19\18\18\17\16\15\15\14\13\13\12\11\10\10\0f\0e\0e\0d\0c\0c\0b\0b\0a\09\09\08\08\07\07\06\06\05\05\04\04\04\03\03\03\02\02\02\01\01\01\01\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\00\01\01\01\01\02\02\02\03\03\03\04\04\04\05\05\06\06\07\07\08\08\09\09\0a\0b\0b\0c\0c\0d\0e\0e\0f\10\10\11\12\13\13\14\15\15\16\17\18\18\19\1a\1b\1c\1c\1d\1e\1f\1f\20\21\22\23\23\24\25\26\27\27\28\29\2a\2a\2b\2c\2c\2d\2e\2f\2f\30\31\31\32\33\33\34\34\35\36\36\37\37\38\38\39\39\3a\3a\3b\3b\3b\3c\3c\3c\3d\3d\3d\3e\3e\3e\3e\3f\3f\3f\3f\3f\3f\3f\3f\3f\3f"
  )



  ;; *** Initialization
  (func $init
  )


;; *** Parameters
  (global $a (mut i32) (i32.const 2))
  (global $b (mut i32) (i32.const 3))
  (global $c (mut i32) (i32.const 5))
  (global $d (mut i32) (i32.const 3))
  (global $e (mut i32) (i32.const 7))
  (global $f (mut i32) (i32.const 8))
  (global $g (mut i32) (i32.const 2))
  (global $h (mut i32) (i32.const 8))
  (global $i (mut i32) (i32.const 3))
  (global $j (mut i32) (i32.const 3))
  (global $k (mut i32) (i32.const 3))
  (global $l (mut i32) (i32.const 4))


;; *** Time
  (global $t (mut i32) (i32.const 0))
  (global $t_counter (mut i32) (i32.const 0))


  ;; *** Function to compute colors

  ;; Calculate cos[(p1 * x + p2 * t + p3) & 0xff]
  (func $cosine_calc (param $x i32) (param $t i32) (param $p1 i32) (param $p2 i32) (param $p3 i32) (result i32)
    local.get $p1
    local.get $x
    i32.mul
    local.get $p2
    local.get $t
    i32.mul
    i32.add
    local.get $p3
    i32.add
    i32.const 0xff
    i32.and
    i32.const 10000
    i32.add
    i32.load8_u
  )

  ;; Calculate cos(...) + cos(...) + cos(...) + cos(...)
  (func $calc (param $x i32) (param $y i32) (param $t i32) (result i32)
    (call $cosine_calc
      (local.get $x)
      (local.get $t)
      (global.get $a)
      (global.get $b)
      (global.get $c)
    )
    (call $cosine_calc
      (local.get $x)
      (local.get $t)
      (global.get $d)
      (global.get $e)
      (global.get $f)
    )
    (call $cosine_calc
      (local.get $y)
      (local.get $t)
      (global.get $g)
      (global.get $h)
      (global.get $i)
    )
    (call $cosine_calc
      (local.get $y)
      (local.get $t)
      (global.get $j)
      (global.get $k)
      (global.get $l)
    )
    i32.add
    i32.add
    i32.add
    i32.const 0xf
    i32.and
  )


  ;; *** Periodic update
  (func $update
    (local $x i32)
    (local $y i32)
    (local $addr i32)
    (local.set $addr (i32.const 0))
    (local.set $x (i32.const 0))
    (loop
      (local.set $y (i32.const 0))
      (loop
        (i32.store
            (local.get $addr)
            (call $calc
              (local.get $x)
              (local.get $y)
              (global.get $t)
            )
        )
        (local.set $addr
          (i32.add 
            (local.get $addr)
            (i32.const 1)
          )
        )
        (local.set $y
          (i32.add 
            (local.get $y)
            (i32.const 1)
          )
        )
        (br_if 0 (i32.lt_u (local.get $y) (i32.const 50)))
      )
      (local.set $x
        (i32.add 
          (local.get $x)
          (i32.const 1)
        )
      )
      (br_if 0 (i32.lt_u (local.get $x) (i32.const 50)))
    )
    (global.set $t_counter
      (i32.add 
        (global.get $t_counter)
        (i32.const 1)
      )
    )
    (if 
      (i32.gt_u
        (global.get $t_counter)
        (i32.const 5)
      )
      (then
        (global.set $t_counter (i32.const 0))
        (global.set $t
          (i32.add 
            (global.get $t)
            (i32.const 1)
          )
        )
      )
    )
  )


  ;; *** Interface to the outside
  (export "init"      (func   $init))
  (export "update"    (func   $update))
  (export "memory"    (memory $mem))
)