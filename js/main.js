let isinitiator = false;
let isStarted = false;
let isChannelReady = false;
let localStream;
let remoteStream;
let pc;

//window.room = prompt("Enter room name:");
let room = 'foo';

let socket = io.connect();

if(room !== "") {
	console.log("Message from client: asking to join room " + room);
	socket.emit("create or join", room);
}

socket.on('created', (room) => {
	console.log(`created room ${room}`);
	isinitiator = true;
});

socket.on('full', (room) => {
	console.log('Message from client: room ' + room + ' is full : ^() ');
});

socket.on('ipaddr', (ipaddr) => {
	console.log('message from client: server ip address is ' + ipaddr);
});

socket.on('join', (room) => {
	console.log('Another peer made a request to join room ' + room);
	console.log(`This peer is the initiator of room ${room} !`);
	isChannelReady = true;
})

socket.on('joined', (room, clientId) => {
	//isinitiator = false;
	console.log('joined: ' + room);
	isChannelReady = true;
});

socket.on('log', (array) => {
	console.log.apply(console, array);
});

///////////////////////////////


const sendMessage = (message) => {
	console.log(`Client sending message : ${message}`);
	socket.emit('message', message);
}

socket.on('message', (message) => {
	console.log('Client received message:', message);
	if(message === 'got user media'){
		maybeStart();
	} else if (message.type === 'offer'){
		if (!isinitiator && !isStarted) {
			maybeStart();
		}
		pc.setRemoteDescription(new RTCSessionDescription(message));
		doAnswer();
 	} else if (message.type === 'answer' && isStarted ){
 		pc.setRemoteDescription(new RTCSessionDescription(message));
 	} else if (message.type === 'candidate' && isStarted ){
 		const candidate = new RTCIceCandidate({
 			sdpMLineIndex: message.label,
 			candidate: message.candidate
 		});
 		pc.addIceCandidate(candidate);
 	} else if (message === 'bye' && isStarted){
 		handleRemoteHangup();
 	}
});

////////////////////////////////////////////////////

let localVideo = document.querySelector('#localVideo');
let remoteVideo = document.querySelector('#remoteVideo');

navigator.mediaDevices.getUserMedia({
	audio: true,
	video: true
})
.then(gotStream)
.catch((e) => {
	alert('getUserMedia() error: ' + e.name);
});

function gotStream(stream) {
	console.log('Adding local stream');
	//localVideo.src = window.URL.createObjectURL(stream);
	localVideo.srcObject = stream;
	localStream = stream;
	sendMessage('got user media');
	if (isinitiator) {
		maybeStart();
	}
}

const maybeStart = () => {
	console.log(`>>>>>>>>>>>>> maybeStart()`, isStarted, localStream, isChannelReady);
	if (!isStarted && typeof localStream !== 'undefined' && isChannelReady) {
		console.log('>>>>>>>>>> creating peer connection');
		createPeerConnection();
		pc.addStream(localStream);
		isStarted = true;
		console.log('isinitiator', isinitiator);
		if(isinitiator){
			doCall();
		}
	}
}

const handleRemoteHangup = () => {

}

const createPeerConnection = () => {
	try {
		pc = new RTCPeerConnection(null);
		pc.onicecandidate = (event) => {
			console.log('icecandidate event : ', event);
			if (event.candidate){
				sendMessage({
					type: 'candidate',
					label: event.candidate.sdpMLineIndex,
					id: event.candidate.sdpMid,
					candidate: event.candidate.candidate
				});
			} else {
				console.log('End of candidates. ');
			}
		}
		
		pc.onaddstream = (event) => {
			console.log('Remote stream added.');
  			//remoteVideo.src = window.URL.createObjectURL(event.stream);
  			remoteVideo.srcObject = event.stream;
  			remoteStream = event.stream;
		}
		
		pc.onremovestream = () => {
			console.log('remote stream removed. event: ', event);
		}
	} catch(e) {
		console.log(`Failed to create PeerConnection, exception: ${e.message}`);
		alert('cannot create RTCPeerConnect object.');
		return;
	}
}

const doCall = () => {
	console.log('Sending offer to peer');
	pc.createOffer(setLocalAndSendMessage, handleCreateOfferError);
}

const doAnswer = () => {
	console.log('Sending answer to peer.');
	pc.createAnswer().then(
		setLocalAndSendMessage,
		onCreateSessionDescriptionError
	);
}

const setLocalAndSendMessage = (desc) => {
	pc.setLocalDescription(desc);
	console.log('setLocalDescription sending message', desc);
	sendMessage(desc);
}

const handleCreateOfferError = (e) => {
	console.log(`create offer error message: ${e}`);
}

const onCreateSessionDescriptionError = (e) => {
	console.log('Failed to create session description: ' + e.toString());
}
