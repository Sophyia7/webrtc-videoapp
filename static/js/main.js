console.log("In lobby!!")

var mapPeers = {}

var usernameInput = document.querySelector('#username');
var btnJoin = document.querySelector('#join-btn');

var username;

var websocket;

function webSocketOnMessage(event){
    var parsedData = JSON.parse(event.data);
    var peerUsername = parsedData['peer'];
    var action = parsedData['action'];

    if(username == peerUsername){
        return;
    }
    var receiever_channel_name = parsedData['message']['receiver_channel_name'];

    if(action == 'new-peer'){
        createOfferer(peerUsername, receiever_channel_name);

        return;
    }

    if(action == 'new-offer'){
        var offer = parsedData['message']['sdp'];

        createAnswerer(offer, peerUsername, receiever_channel_name);

        return;
    }

    if(action == 'new-parser'){
        var answer = parsedData['message']['sdp'];

        var peer = mapPeers[peerUsername][0];

        peer.setRemoteDescription(answer);

        return;
    }
}

btnJoin.addEventListener('click', () => {
    username = usernameInput.value;

    console.log('username: ', username);

    if(username == ''){
        return;
    }

    usernameInput.value = '';
    usernameInput.disabled = true;
    usernameInput.style.visiblity = 'hidden';

    btnJoin.disabled = true;
    btnJoin.style.visiblity = 'hidden';

    var labelUsername = document.querySelector('#label-username');
    labelUsername.innerHTML = username;

    var loc = window.location;
    var wsStart = 'ws://';

    if(loc.protocol == 'https:'){
        wsStart = 'wss://';
    }

    var endPoint = wsStart + loc.host + loc.pathname;

    console.log('endPoint: ', endPoint);

    websocket = new websocket(endPoint);

    websocket.addEventListener('open', (e) => {
        console.log('Connection opened!');

        sendSignal('new-peer', {});
    });
    websocket.addEventListener('message', webSocketOnMessage);
    websocket.addEventListener('close', (e) => {
        console.log('Connection closed!');
    });
    websocket.addEventListener('error', (e) => {
        console.log('Error Occured!');
    });
})

var localStream = new MediaStream();


const constrants = {
    'video': true,
    'audio': true,
};

const localVideo = document.querySelector('#local-video');

const btnToggleAudio = document.querySelector('#btn-toggle-audio');

const btnToggleVideo = document.querySelector('#btn-toggle-video');

var useMedia = navigator.mediaDevices.getUserMedia(constrants)
    .then(stream => {
        localStream = stream;
        localVideo.srcObject = localStream;
        localVideo.muted = true;

        var audioTracks = stream.getAudioTracks();
        var videoTracks = stream.getVideoTracks();
    
        audioTracks[0].enabled = true;
        videoTracks[0].enabled = true;

        btnToggleAudio.addEventListener('click', () => {
            audioTracks[0].enabled = !audioTracks[0].enabled;

            if(audioTracks[0].enabled){
                btnToggleAudio.innerHTML = 'Audio Mute';

                return;
            }

            btnToggleAudio.innerHTML = 'Audio Unmute';
        });

        btnToggleVideo.addEventListener('click', () => {
            videoTracks[0].enabled = !videoTracks[0].enabled;

            if(videoTracks[0].enabled){
                btnToggleVideo.innerHTML = 'Turn off Video';

                return;
            }

            btnToggleVideo.innerHTML = 'Turn on Video';
        });

    })

    .catch(error => {
        console.log('Error accessing media devices ', error);
    })

var btnSendMsg = document.querySelector('#btn-send-msg');
var messageList = document.querySelector('message-list');
var messageInput = document.querySelector('msg');

btnSendMsg.addEventListener('click', sendMsgOnClick);

function sendMsgOnClick(){
    var message = messageInput.value;

    var li = document.createElement('li');
    li.appendChild(document.createTextNode('Me: ', message));
    messageList.appendChild(li);

    var dataChannels = getDataChannels();

    message = username + ': ' + message;

    for(index in dataChannels){
        dataChannels[index].send(message);
    }

    messageInput.value = '';
}

function sendSignal(action, message){
    var jsonStr = JSON.stringify({
        'peer': username,
        'action': action,
        'message': message,
    });

    webSocket.send(jsonStr);
};

function createOfferer(peerUsername, receiver_channel_name){
    var peer = RTCPeerConnection(null);

    addLocalTracks(peer); 

    var dc = peer.createDataChannel('channel');
    dc.addEventListener('open', () => {
        console.log('Connection opened!!');
    })
    dc.addEventListener('message', dcOnMessage);

    var remoteVideo = createVideo(peerUsername);
    setOnTrack(peer, remoteVideo);

    mapPeers[peerUsername] = [peer, dc];

    peer.addEventListener('iceconnectionstatestatechange', () => {
        delete mapPeers[peerUsername];

        if(iceConnectionState === 'failed' || iceConnectionState === 'disconnected' || iceConnectionState === 'closed')
            delete mapPeers[peerUsername];

            if (iceConnectionState != 'closed'){
                peer.close();
            }

            removeVideo(remoteVideo);
    })
};

peer.addEventListener('icecandiadate', (event) => {
    if(event.candidate){
        console.log('New ice candiadate: ', JSON.stringify(peer.localDescription));

        return;
    }
    sendSignal('new-offer', {
        'sdp': peer.localDescription,
        'recieve_channel_name': receiever_channel_name
    });
});

peer.createOffer()
    .then(o => peer.setLocalDescription(o))
    .then(() => {
        console.log('Local desciption set succesfully. ');
    })

function createAnswerer(offer, peerUsername, receiever_channel_name){
    var peer = RTCPeerConnection(null);

    addLocalTracks(peer); 

    var remoteVideo = createVideo(peerUsername);
    setOnTrack(peer, remoteVideo);

    peer.addEventListener('datachannel', e => {
        peer.dc = e.channel;

        peer.dc.addEventListener('open', () => {
            console.log('Connection opened!!');
        })
        peer.dc.addEventListener('message', dcOnMessage);

        mapPeers[peerUsername] = [peer, peer.dc];
    });


    peer.addEventListener('iceconnectionstatestatechange', () => {
        delete mapPeers[peerUsername];

        if(iceConnectionState === 'failed' || iceConnectionState === 'disconnected' || iceConnectionState === 'closed')
            delete mapPeers[peerUsername];

            if (iceConnectionState != 'closed'){
                peer.close();
            }

            removeVideo(remoteVideo);
    })
};

peer.addEventListener('icecandiadate', (event) => {
    if(event.candidate){
        console.log('New ice candiadate: ', JSON.stringify(peer.localDescription));

        return;
    }
    sendSignal('new-offer', {
        'sdp': peer.localDescription,
        'recieve_channel_name': receiever_channel_name
    });
});

  peer.setRemoteDescription(offer)
    .the(() => {
        console.log('Remote Description set succesffully for %s.', peerUsername);

        return peer.createAnswer();
    })
    .then( a => {
        console.log('Answer creates!')

        peer.setLocalDescription(a); 
    })


function addLocalTracks(peer){
    localStream.getTracks().forEach(track => {
        peer.addTrack(track, localStream);
    });

    return;
}


function dcOnMessage(event){
    var message = event.data;

    var li = document.createElement('li');
    li.appendChild(document )
}

function createVideo(peerUsername){
    var videoContanier = document.querySelector('#video-contanier');

    var remoteVideo = document.createElement('video');

    remoteVideo.id = peerUsername + '-video';
    remoteVideo.autoplay = true;
    remoteVideo.playsInline = true;

    var videoWrapper = document.createElement('div');

    videoContanier.appendChild(videoWrapper);

    videoWrapper.appendChild(remoteVideo);

    return remoteVideo;
}

function setOnTrack(peer, remoteVideo){
    var remoteStream = new MediaStream();

    remoteVideo.srcObject = remoteStream;

    peer.addEventListener('track', async (event) => {
        remoteStream.addTrack(event.track, remote)
    });
}

function removeVideo(video){
    var videoWrapper = video.parentNode;

    videoWrapper.parentNode.removeChild(videoWrapper);


}

function getDataChannels(){
    var dataChannels = [];

    for(peerUsername in mapPeers){
        var dataChannel = mapPeers[peerUsername][1];

        dataChannels.push(dataChannel);
    }

    return dataChannels;
}