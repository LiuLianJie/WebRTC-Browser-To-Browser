const os = require('os');
const nodeStatic = require('node-static');
const http = require('http');
const socketIO = require('socket.io');

// create a static server
const fileServer = new (nodeStatic.Server)();
const app = http.createServer((req,res) => {
	fileServer.serve(req, res);
}).listen(8088);

const io = socketIO.listen(app);
let numClients = 0;

io.on('connection', (socket) => {
	// convenience function to log server messages on the client
	function log() {
		const array = ['Message from server:'];
		array.push.apply(array, arguments);
		socket.emit('log', array);
	}

	socket.on('message', (message) => {
		log('Client said: ',message);
		socket.broadcast.emit('message', message);
		//socket.emit('message',message);
	});

	socket.on('create or join', (room) => {
		log('Received request to create or join room' + room);

		//numClients ++;
		//console.log(io.rooms.length);
		numClients = io.engine.clientsCount;
		log('Room '+ room + ' now has ' + numClients + ' client(s)');
		if(numClients === 1){
			socket.join(room);
			log('Client ID ' + socket.id + ' created room ' + room);
			socket.emit('created', room);
		} else if (numClients === 2){
			log('Client ID ' + socket.id + ' joined room ' + room);
			io.sockets.in(room).emit('join', room);
			socket.join(room);
			socket.emit('joined', room, socket.id);
			io.sockets.in(room).emit('ready');
		} else {
			socket.emit('full', room);
		}
	});

	socket.on('ipaddr', () => {
		const ifaces = os.networkInterfaces();
		for (let dev in ifaces) {
			ifaces[dev].forEach((details) => {
				if (details.family === 'IPv4' && details.address !== '127.0.0.1') {
					socket.emit('ipaddr', details.address);
				}
			});
		}
	});

	socket.on('disconnect', () => {
		//numClients --;
	})
});