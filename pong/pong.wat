(module
    (memory $mem 1) ;; Allocate 1 page (64KB) of memory
    (global $BALL_BOUNDS i32 (i32.const 0)) ;; Bounds memory address
    (global $BALL_POSITION i32 (i32.const 8)) ;; Position memory address
    (global $BALL_VELOCITY i32 (i32.const 16)) ;; Velocity memory address

    ;; Sets the bounds size
    (func $setBounds (param $width i32) (param $height i32)
        (i32.store
            (get_global $BALL_BOUNDS)
            (get_local $width)
        )
        (i32.store
            (i32.add ;; Bounds memory address + 4 bytes
                (get_global $BALL_BOUNDS)
                (i32.const 4)
            )
            (get_local $height)
        )
    )

    ;; Sets the ball position
    (func $setBallPosition (param $x f32) (param $y f32)
        (f32.store
            (get_global $BALL_POSITION)
            (get_local $x)
        )
        (f32.store
            (i32.add ;; Ball position memory address + 4 bytes
                (get_global $BALL_POSITION)
                (i32.const 4)
            )
            (get_local $y)
        )
    )

    ;; Sets the ball velocity
    (func $setBallVelocity (param $x f32) (param $y f32)
        (f32.store
            (get_global $BALL_VELOCITY)
            (get_local $x)
        )
        (f32.store
            (i32.add ;; Ball position memory address + 4 bytes
                (get_global $BALL_VELOCITY)
                (i32.const 4)
            )
            (get_local $y)
        )
    )

    ;; Gets the X position of the ball
    (func $getBallX (result f32)
        (f32.load 
            (get_global $BALL_POSITION)
        )
    )

    ;; Gets the X position of the ball
    (func $getBallY (result f32)
        (f32.load 
            (i32.add
                (get_global $BALL_POSITION)
                (i32.const 4)
            )
        )
    )

    ;; Gets the X position of the ball
    (func $getBallRadius (result i32)
        i32.const 8
    )

    (func $invertVelocityX
        (f32.store 
            (get_global $BALL_VELOCITY)
            (f32.mul (f32.load (get_global $BALL_VELOCITY)) (f32.const -1))
        )
    )

    (func $invertVelocityY
        (f32.store 
            (i32.add (get_global $BALL_VELOCITY) (i32.const 4))
            (f32.mul (f32.load (i32.add (get_global $BALL_VELOCITY) (i32.const 4))) (f32.const -1))
        )
    )

    ;; Update the game state
    (func $update
        ;; Is the X position greater than 320 or less than 0?
        (if (f32.gt (f32.load (get_global $BALL_POSITION)) (f32.const 320))
            (then (call $invertVelocityX))
        )
        (if (f32.lt (f32.load (get_global $BALL_POSITION)) (f32.const 0))
            (then (call $invertVelocityX))
        )

        ;; Is the Y position greater than 200 or less than 0?
        (if (f32.gt (f32.load (i32.add (get_global $BALL_POSITION) (i32.const 4))) (f32.const 200))
            (then (call $invertVelocityY))
        )
        (if (f32.lt (f32.load (i32.add (get_global $BALL_POSITION) (i32.const 4))) (f32.const 0))
            (then (call $invertVelocityY))
        )

        ;; Update the position of the ball
        (f32.store
            (get_global $BALL_POSITION)
            (f32.add
                (f32.load (get_global $BALL_POSITION))
                (f32.load (get_global $BALL_VELOCITY))
            )
        )
        (f32.store
            (i32.add (get_global $BALL_POSITION) (i32.const 4))
            (f32.add
                (f32.load (i32.add (get_global $BALL_POSITION) (i32.const 4)))
                (f32.load (i32.add (get_global $BALL_VELOCITY) (i32.const 4)))
            )
        )
    )

    (export "setBounds" (func $setBounds))
    (export "setBallPosition" (func $setBallPosition))
    (export "setBallVelocity" (func $setBallVelocity))
    (export "getBallX" (func $getBallX))
    (export "getBallY" (func $getBallY))
    (export "getBallRadius" (func $getBallRadius))
    (export "update" (func $update))
)