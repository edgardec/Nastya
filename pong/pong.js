fetch('./pong.wasm').then(response => 
    response.arrayBuffer()
).then(bytes => WebAssembly.instantiate(bytes)).then(results => {
    instance = results.instance;
    console.log("Initializing game...");
    instance.exports.setBounds(320,200);
    instance.exports.setBallPosition(30,20);
    instance.exports.setBallVelocity(3,1.5);

    var lastUpdate = Date.now();
    var canvas = document.getElementById("canvas");
    canvas.width = 320;
    canvas.height = 200;

    var context = canvas.getContext("2d");

    var timer = setInterval(tick, 0);
    function tick() {
        // Calculate delta time since last update.
        // var now = Date.now();
        // var dt = now - lastUpdate;
        // lastUpdate = now;

        // Update
        instance.exports.update();

        // Render
        context.clearRect(0, 0, 320, 200);
        context.beginPath();
        context.arc(
            instance.exports.getBallX(), 
            instance.exports.getBallY(), 
            instance.exports.getBallRadius(), 
            0, 2 * Math.PI);
        context.stroke();
    }
});