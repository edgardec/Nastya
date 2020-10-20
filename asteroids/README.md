# Asteroids 

This is a WebAssembly port of an [Asteroids game written in C](https://github.com/flightcrank/asteroids):

**[Live Demo](http://www.levelupwasm.com/apps/asteroids/index.html)** | **[WebAssembly Tutorial](https://medium.com/@robaboukhalil/porting-games-to-the-web-with-webassembly-70d598e1a3ec?source=friends_link&sk=20c835664031227eae5690b8a12514f0)**

![Screenshot of asteroids game](https://raw.githubusercontent.com/robertaboukhalil/wasm-asteroids/master/screenshot.png)

If you're looking for a practical guide to learning WebAssembly, check out my book [Level up with WebAssembly](http://www.levelupwasm.com/).

## Build

Fetch Emscripten from DockerHub:

```bash
docker pull robertaboukhalil/emsdk:1.38.26
```

Create a container from that image:

```bash
# Create container from that image
docker run -dt --name wasm robertaboukhalil/emsdk:1.38.26

# Enter the container
docker exec -it wasm bash
```

Within the container, fetch the code:

```bash
git clone "https://github.com/robertaboukhalil/wasm-asteroids.git"
cd wasm-asteroids
```

And compile it to WebAssembly:

```bash
emcc \
    -o app.html asteroids/*.c \
    -Wall -g -lm \
    -s USE_SDL=2
```
