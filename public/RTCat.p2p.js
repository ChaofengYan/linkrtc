//channel对象
/**********************************************************/
/*                                                        */
/*                       channel                          */
/*                                                        */
/**********************************************************/
/*-------------------channel开始----------------------*/
//订阅事件
// * socket_close : socket连接关闭
// * _peers : 连接候选
// * _ice_candidate : 连接打开
// * _new_peer : 加入stream
// * _remove_peer : 建立数据通道
// * _offer : 数据通道打开
// * _answer : 数据通道接收到数据


//发布事件
// * pc_icecandidate : 连接候选
// * pc_open : 连接打开
// * pc_addstream : 加入stream
// * pc_datachannel : 建立数据通道
// * channel_open : 数据通道打开
// * channel_message : 数据通道接收到数据(消息或文件)
// * channel_error : 数据通道错误
// * channel_close : 关闭数据通道
// * stream_create_error : 无法获取本地流
// * data_channel_create_error : 数据通道创建失败
// * canvas_cmd_receive：收到其他客户端画板命令


//返回：send方法

RTCat.p2p = (function () {
    //----------------------模块作用域变量---开始------------------
    var
        configMap = {
            settabel_map: {
                "video": true,
                "audio": true
            }
        },
        stateMap = {},
        iceServer = {
            "iceServers": [{
                "url": "stun:stun.l.google.com:19302"
        }]
        },
        peerConnections = {},
        localMediaStream = null,
        //保存所有的data channel，键为socket id，值通过PeerConnection实例的createChannel创建
        dataChannels = {},
        initializedStreams = 0,
        numStreams = 0,
        //保存所有与本地连接的socket的id
        connections = [],
        socket = RTCat.socket,

        PeerConnection = (window.PeerConnection || window.webkitPeerConnection00 || window.webkitRTCPeerConnection || window.mozRTCPeerConnection),
        URL = (window.URL || window.webkitURL || window.msURL || window.oURL),
        getUserMedia = (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia),
        nativeRTCIceCandidate = (window.mozRTCIceCandidate || window.RTCIceCandidate),
        nativeRTCSessionDescription = (window.mozRTCSessionDescription || window.RTCSessionDescription), // order is very important: "RTCSessionDescription" defined in Nighly but useless
        moz = !!navigator.mozGetUserMedia

    ;
    //----------------------模块作用域变量---结束------------------


    //----------------------事件处理程序---开始--------------------
    //订阅socket模块发布的事件----begin--------
    $.gevent.subscribe('socket_close', function (data) {
        if(localMediaStream) localMediaStream.close();
        var pcs = peerConnections;
        for (i = pcs.length; i--;) {
            closePeerConnection(pcs[i]);
        }
        peerConnections = [];
        dataChannels = {};
    });

    $.gevent.subscribe('_peers', function (data) {
        myId = data.you;
        connections = data.connections;
        //获取到所有客户端socketId后，再尝试获取本地流
        var options = configMap.settabel_map;
        options.video = !!options.video;
        options.audio = !!options.audio;
        if (getUserMedia) {
            numStreams++;
            getUserMedia.call(navigator, options, function (stream) {
                    console.log('111');
                    localMediaStream = stream;
                    initializedStreams++;
                    $.gevent.publish("stream_created", stream);
                    if (initializedStreams === numStreams) {
                        //初始化“四部曲”
                        createPeerConnections(); //创建与其他用户连接的PeerConnections
                        addStreams(); //将本地流添加到所有的PeerConnection实例中
                        addDataChannels(); //对所有的PeerConnections创建Data channel
                        sendOffers(); //向所有PeerConnection发送Offer类型信令
                    }
                },
                function (error) {
                    console.log('222');
                    //that.emit("stream_create_error", error);
                });
        } else {
            //that.emit("stream_create_error", new Error('WebRTC is not yet supported in this browser.'));
        }

    });

    $.gevent.subscribe("_ice_candidate", function (data) {
        var candidate = new nativeRTCIceCandidate(data);
        var pc = peerConnections[data.socketId];
        pc.addIceCandidate(candidate);
    });

    $.gevent.subscribe('_new_peer', function (data) {
        var pc = createPeerConnection(data.socketId);
        pc.addStream(localMediaStream);
        connections.push(data.socketId);
    });

    $.gevent.subscribe('_remove_peer', function (data) {
        closePeerConnection(peerConnections[data.socketId]);
        delete peerConnections[data.socketId];
        delete dataChannels[data.socketId];
    });

    $.gevent.subscribe('_offer', function (data) {
        var socketId = data.socketId,
            sdp = data.sdp,
            pc = peerConnections[socketId];
        //发送Answer信令
        pc.setRemoteDescription(new nativeRTCSessionDescription(sdp));
        pc.createAnswer(function (session_desc) {
            pc.setLocalDescription(session_desc);
            socket.send(JSON.stringify({
                "eventName": "__answer",
                "data": {
                    "socketId": socketId,
                    "sdp": session_desc
                }
            }));
        }, function (error) {
            console.log(error);
        });
    });

    $.gevent.subscribe('_answer', function (data) {
        var socketId = data.socketId,
            sdp = data.sdp,
            pc = peerConnections[socketId];
        pc.setRemoteDescription(new nativeRTCSessionDescription(sdp));
    });

    //接受来自socket模块发布的事件----end--------	


    //----------------------事件处理程序---结束-------------------- 

    //初始化（第1步）
    createPeerConnections = function () {
        var i, m;
        for (i = 0, m = connections.length; i < m; i++) {
            createPeerConnection(connections[i]);
        }
    };
    //创建单个PeerConnection,并将本地流加入
    createPeerConnection = function (socketId) {
        var pc = new PeerConnection(iceServer);
        peerConnections[socketId] = pc;
        pc.onicecandidate = function (evt) {
            //$.gevent.publish('pc_icecandidate', evt);
            if (evt.candidate)
                socket.send(JSON.stringify({
                    "eventName": "__ice_candidate",
                    "data": {
                        "label": evt.candidate.sdpMLineIndex,
                        "candidate": evt.candidate.candidate,
                        "socketId": socketId
                    }
                }));
        };

        pc.onopen = function () {
            //将当前pc放入Model模块中的peerConnections变量中

            //$.gevent.publish('pc_open', [pc]);
        };

        pc.onaddstream = function (evt) {
            //$.gevent.publish('pc_addstream', [evt]);
            $.gevent.publish('pc_addstream', evt.stream, socketId, pc);
        };

        pc.ondatachannel = function (evt) {
            $.gevent.publish('pc_add_data_channel', evt.channel, socketId, pc);
            addDataChannel(socketId, evt.channel);
        };

        return pc;
    };

    //初始化（第2步）
    //将本地流添加到所有的PeerConnection实例中
    addStreams = function () {
        var i, m,
            stream,
            connection;
        for (connection in peerConnections) {
            peerConnections[connection].addStream(localMediaStream);
        }
    };

    //初始化（第3步）
    //对所有的PeerConnections创建Data channel
    addDataChannels = function () {
        var connection;
        for (connection in peerConnections) {
            createDataChannel(connection);
        }
    };

    //对某一个PeerConnection创建Data channel
    createDataChannel = function (socketId, label) {
        var pc, key, channel;
        pc = peerConnections[socketId];

        if (!socketId) {
            //this.emit("data_channel_create_error", socketId, new Error("attempt to create data channel without socket id"));
        }

        if (!(pc instanceof PeerConnection)) {
            //this.emit("data_channel_create_error", socketId, new Error("attempt to create data channel without peerConnection"));
        }
        try {
            channel = pc.createDataChannel(label);
        } catch (error) {
            //this.emit("data_channel_create_error", socketId, error);
        }

        return addDataChannel(socketId, channel);
    };

    //为Data channel绑定相应的事件回调函数
    addDataChannel = function (socketId, channel) {
        channel.onopen = function () {
            //that.emit('data_channel_opened', channel, socketId);
        };

        channel.onclose = function (event) {
            delete dataChannels[socketId];
            //that.emit('data_channel_closed', channel, socketId);
        };

        channel.onmessage = function (message) {
            var json;
            json = JSON.parse(message.data);

            if (json.type === '__file') {
                /*that.receiveFileChunk(json);*/
                $.gevent.publish('channel_file', json, socketId);
                //that.parseFilePacket(json, socketId);
            } else if (json.canvas) {
                $.gevent.publish('canvas_cmd_receive', json, socketId);
            } else {
                $.gevent.publish('channel_message', channel, socketId, json.data);
                //that.emit('data_channel_message', channel, socketId, json.data);
            }
        };

        channel.onerror = function (err) {
            //that.emit('data_channel_error', channel, socketId, err);
        };

        dataChannels[socketId] = channel;
        return channel;
    };


    //关闭PeerConnection连接
    closePeerConnection = function (pc) {
        if (!pc) return;
        pc.close();
    };


    //初始化（第4步）			
    //向所有PeerConnection发送Offer类型信令
    sendOffers = function () {
        var i, m,
            pc,
            pcCreateOfferCbGen = function (pc, socketId) {
                return function (session_desc) {
                    pc.setLocalDescription(session_desc);
                    socket.send(JSON.stringify({
                        "eventName": "__offer",
                        "data": {
                            "sdp": session_desc,
                            "socketId": socketId
                        }
                    }));
                };
            },
            pcCreateOfferErrorCb = function (error) {
                console.log(error);
            };
        for (item in peerConnections) {
            pc = peerConnections[item];
            pc.createOffer(pcCreateOfferCbGen(pc, item), pcCreateOfferErrorCb);
        }
    };


    //接收到answer类型信令后将对方的session描述写入PeerConnection中
    receiveAnswer = function (socketId, sdp) {
        var pc = peerConnections[socketId];
        pc.setRemoteDescription(new nativeRTCSessionDescription(sdp));
    };

    //------------------------公共方法---开始--------------------
    //公共方法/configModule/
    //目的:接收自定义配置
    //参数:键值对对象
    // *input_map
    //返回:true
    configModule = function (input_map) {

    };

    //公共方法/initModule/
    //目的:初始化模块——创建所有p2p连接及其datachannel，并添加本地流，发送offer
    //参数:
    // * 
    //返回:true
    initModule = function () {

        return true;
    };

    //公共方法/send/
    //参数：
    // * socketId - 客户端标识
    // * data -发送的内容
    send = function (socketId, data) {
        if (socketId == 'all') {
            for (socketId in dataChannels) {
                send(socketId, data); //自调用
            }
        } else {
            if (dataChannels[socketId].readyState.toLowerCase() === 'open') {
                dataChannels[socketId].send(data);
            }
        }
    }


    //返回公共方法
    return {
        configModule: configModule,
        initModule: initModule,
        send: send,
    };
    //----------------------公共方法---结束--------------------- 

}());
