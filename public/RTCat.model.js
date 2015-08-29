//file对象
//msg对象:订阅Trans模块发送过来的数据并分发，并通过Trans模块的socket和channel两个对象的send方法发送数据
//canvas对象：

/* socket, */
RTCat.model = (function () {
    //-----------------------------模块作用域变量---开始--------
    var
        configMap = {
            settabel_map: {}
        },
        stateMap = {},

        //所在房间
        room = "",

        //保存所有与本地连接的socket的id
        connections = [],
        //初始时需要构建链接的数目
        numStreams = 0,
        //初始时已经连接的数目
        initializedStreams = 0,

        socket = RTCat.socket,
        p2p = RTCat.p2p,
        //保存所有发文件的data channel及其发文件状态
        // * 数据通道(datachannel) - fileChannels[socketId]
        // * 待发送文件信息(fileToSend) - fileChannels[socketId][sendId]
        fileChannels = {},

        //保存所有接受到的文件，格式：
        //*receiveFiles[sendId] = {
        //    socketId: 客户端socketId,
        //    state: 文件状态(ask/receive/end),
        //    name: 文件名称,
        //    size: 文件大小
        //};
        receiveFiles = {},
        //接收文件时用于暂存接收文件
        fileData = {},
        packetSize = 1000;
    //-------------------------模块作用域变量---结束--------


    //-------------------------事件处理程序- --开始--------


    socket_open = function () {
        //emit("socket_opened", socket);
    };

    socket_message = function (message) {
            var json = JSON.parse(message.data);
            //
        },

        socket_close = function (data) {
            fileChannels = {};
            connections = [];
            fileData = {};
            //emit('socket_closed', socket);
        }

    socket_error = function (data) {

    }

    pc_icecandidate = function (evt) {
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

    pc_open = function () {

    };

    pc_addstream = function (evt) {

    };

    pc_datachannel = function (evt) {
        addDataChannel(socketId, evt.channel);
        //emit('pc_add_data_channel', evt.channel, socketId, pc);
    };

    channel_open = function (evt) {

    };
    channel_close = function (evt) {

    };
    channel_error = function (evt) {

    };

    channel_message = function (evt) {

    };
    //-----------------------------事件处理程序---结束------------- 

    /**********************************************************/
    /*                                                        */
    /*                       msg                              */
    /*                                                        */
    /**********************************************************/
    //订阅socket、p2p模块中注册的事件
    // * socket_open:连接
    // * socket_message:接收到消息
    // * socket_error:错误
    // * socket_close:连接关闭
    // * pc_icecandidate : 连接候选
    // * pc_open : 连接打开
    // * pc_addstream : 加入stream
    // * pc_datachannel : 建立数据通道
    // * channel_open : 数据通道打开
    // * channel_message : 数据通道接收到消息
    // * channel_error : 数据通道错误
    // * channel_close : 关闭数据通道


    $.gevent.subscribe('socket_open', socket_open);
    $.gevent.subscribe('socket_message', socket_message);
    $.gevent.subscribe('socket_error', socket_error);
    $.gevent.subscribe('socket_close', socket_close);
    $.gevent.subscribe('pc_icecandidate', pc_icecandidate);
    $.gevent.subscribe('pc_open', pc_open);
    $.gevent.subscribe('pc_addstream', pc_addstream);
    $.gevent.subscribe('pc_datachannel', pc_datachannel);
    $.gevent.subscribe('channel_open', channel_open);
    $.gevent.subscribe('channel_close', channel_close);

    $.gevent.subscribe('channel_message', channel_message);
    $.gevent.subscribe('channel_error', channel_error);

    $.gevent.subscribe('_peers', function (data) {
        //获取所有服务器上的
        connections = data.connections;
    });

    $.gevent.subscribe('_new_peer', function (data) {
        connections.push(data.socketId);
    });

    $.gevent.subscribe('_remove_peer', function (data) {
        var sendId;
        for (sendId in fileChannels[data.socketId]) {
            //emit("send_file_error", new Error("Connection has been closed"), data.socketId, sendId, fileChannels[data.socketId][sendId].file);
        }
        delete fileChannels[data.socketId];

    });


    /**********************************************************/
    /*                                                        */
    /*                       file                             */
    /*                                                        */
    /**********************************************************/
    //订阅事件:
    // * channel_file ： 数据通道接收到文件，收到其他客户端传来的文件类指令
    // * receive_file_error : 
    //
    //发布事件：
    // * file_receive_complete : 文件接收完成
    // * 

    file = (function () {

        /************************公有部分************************/

        //解析Data channel上的文件类型包,来确定信令类型
        parseFilePacket = function (json, socketId) {
            var signal = json.signal;
            if (signal === 'ask') {
                receiveFileAsk(json.sendId, json.name, json.size, socketId);
            } else
            if (signal === 'accept') {
                receiveFileAccept(json.sendId, socketId);
            } else if (signal === 'refuse') {
                receiveFileRefuse(json.sendId, socketId);
            } else if (signal === 'chunk') {
                receiveFileChunk(json.data, json.sendId, socketId, json.last, json.percent);
            } else if (signal === 'close') {
                //TODO
            }
        };


        $.gevent.subscribe('channel_file', parseFilePacket);
        $.gevent.subscribe('receive_file_error', function (error, sendId) {
            cleanReceiveFile(sendId);
        });


        /***********************发送者部分***********************/
        //通过Dtata channel向房间内所有其他用户广播文件
        shareFile = function (dom) {
            var socketId;
            for (var i = 0; i < connections.length; i++) {
                sendFile(dom, connections[i]);
            }
        };

        //向某一单个用户发送文件
        sendFile = function (dom, socketId) {
            var file,
                reader,
                fileToSend,
                sendId;
            if (typeof dom === 'string') {
                dom = document.getElementById(dom);
            }
            if (!dom) {
                //emit("send_file_error", new Error("Can not find dom while sending file"), socketId);
                return;
            }
            if (!dom.files || !dom.files[0]) {
                //emit("send_file_error", new Error("No file need to be sended"), socketId);
                return;
            }
            file = dom.files[0];
            fileChannels[socketId] = fileChannels[socketId] || {};
            sendId = getRandomString();
            fileToSend = {
                file: file,
                state: "ask"
            };
            fileChannels[socketId][sendId] = fileToSend;
            sendAsk(socketId, sendId, fileToSend);
            $.gevent.publish("send_file", sendId, socketId, file);
        };

        //发送多个文件的碎片
        sendFileChunks = function () {
            var socketId,
                sendId,
                nextTick = false;
            for (socketId in fileChannels) {
                for (sendId in fileChannels[socketId]) {
                    if (fileChannels[socketId][sendId].state === "send") {
                        nextTick = true;
                        sendFileChunk(socketId, sendId);
                    }
                }
            }
            if (nextTick) {
                setTimeout(function () {
                    sendFileChunks();
                }, 10);
            }
        };

        //发送某个文件的碎片
        sendFileChunk = function (socketId, sendId) {
            var
                fileToSend = fileChannels[socketId][sendId],
                packet = {
                    type: "__file",
                    signal: "chunk",
                    sendId: sendId
                };

            fileToSend.sendedPackets++;
            fileToSend.packetsToSend--;


            if (fileToSend.fileData.length > packetSize) {
                packet.last = false;
                packet.data = fileToSend.fileData.slice(0, packetSize);
                packet.percent = fileToSend.sendedPackets / fileToSend.allPackets * 100;

                $.gevent.publish("send_file_chunk", sendId, socketId, fileToSend.sendedPackets / fileToSend.allPackets * 100, fileToSend.file);
            } else {
                packet.data = fileToSend.fileData;
                packet.last = true;
                fileToSend.state = "end";
                $.gevent.publish("sended_file", sendId, socketId, fileToSend.file);
                cleanSendFile(sendId, socketId);
            }


            p2p.send(socketId, JSON.stringify(packet));
            fileToSend.fileData = fileToSend.fileData.slice(packet.data.length);
        };

        //发送文件请求后若对方同意接受,开始传输
        receiveFileAccept = function (sendId, socketId) {
            var
                fileToSend,
                reader,
                initSending = function (event, text) {
                    fileToSend.state = "send";
                    fileToSend.fileData = event.target.result;
                    fileToSend.sendedPackets = 0;
                    fileToSend.packetsToSend = fileToSend.allPackets = parseInt(fileToSend.fileData.length / packetSize, 10);
                    sendFileChunks();
                };
            fileToSend = fileChannels[socketId][sendId];
            reader = new window.FileReader(fileToSend.file);
            reader.readAsDataURL(fileToSend.file);
            reader.onload = initSending;
            //emit("send_file_accepted", sendId, socketId, fileChannels[socketId][sendId].file);
        };

        //发送文件请求后若对方拒绝接受,清除掉本地的文件信息
        receiveFileRefuse = function (sendId, socketId) {
            fileChannels[socketId][sendId].state = "refused";
            $.gevent.publish("send_file_refused", sendId, socketId, fileChannels[socketId][sendId].file);
            cleanSendFile(sendId, socketId);
        };

        //清除发送文件缓存
        cleanSendFile = function (sendId, socketId) {
            delete fileChannels[socketId][sendId];
        };

        //发送文件请求
        sendAsk = function (socketId, sendId, fileToSend) {
            var packet;
            packet = {
                name: fileToSend.file.name,
                size: fileToSend.file.size,
                sendId: sendId,
                type: "__file",
                signal: "ask"
            };
            p2p.send(socketId, JSON.stringify(packet));
        };

        //获得随机字符串来生成文件发送ID
        getRandomString = function () {
            return (Math.random() * new Date().getTime()).toString(36).toUpperCase().replace(/\./g, '-');
        };

        /***********************接收者部分***********************/


        //接收到文件碎片
        receiveFileChunk = function (data, sendId, socketId, last, percent) {
            var
                fileInfo = receiveFiles[sendId];
            if (!fileInfo.data) {
                fileInfo.state = "receive";
                fileInfo.data = "";
            }
            fileInfo.data = fileInfo.data || "";
            fileInfo.data += data;
            if (last) {
                fileInfo.state = "end";
                getTransferedFile(sendId);
            } else {
                $.gevent.publish("receive_file_chunk", sendId, socketId, fileInfo.name, percent);
            }
        };

        //接收到所有文件碎片后将其组合成一个完整的文件并自动下载
        getTransferedFile = function (sendId) {
            var
                fileInfo = receiveFiles[sendId];
            $.gevent.publish('file_receive_complete', fileInfo);
            cleanReceiveFile(sendId);
        };

        //接收到发送文件请求后记录文件信息
        receiveFileAsk = function (sendId, fileName, fileSize, socketId) {
            receiveFiles[sendId] = {
                socketId: socketId,
                state: "ask",
                name: fileName,
                size: fileSize
            };
            $.gevent.publish('receive_file_ask', sendId, socketId, fileName, fileSize);
        };

        //发送同意接收文件信令
        sendFileAccept = function (sendId) {
            var
                fileInfo = receiveFiles[sendId],
                packet;

            packet = {
                type: "__file",
                signal: "accept",
                sendId: sendId
            };
            p2p.send(fileInfo.socketId, JSON.stringify(packet));
        };

        //发送拒绝接受文件信令
        sendFileRefuse = function (sendId) {
            var
                fileInfo = receiveFiles[sendId],
                packet;

            packet = {
                type: "__file",
                signal: "refuse",
                sendId: sendId
            };

            p2p.send(fileInfo.socketId, JSON.stringify(packet));

            cleanReceiveFile(sendId);
        };

        //清除接受文件缓存
        cleanReceiveFile = function (sendId) {
            delete receiveFiles[sendId];
        };

        return {
            parseFilePacket: parseFilePacket,
            shareFile: shareFile,
            sendFileAccept: sendFileAccept,
            sendFileRefuse: sendFileRefuse
        }
    }());

    /**********************************************************/
    /*                                                        */
    /*                      canvas                            */
    /*                                                        */
    /**********************************************************/
    //订阅事件
    // * canvas_cmd_receive：收到其他客户端画板命令
    // * ：
    // * ：
    // * ：
    // * ：
    // * ：
    //发布事件
    // * ：
    // * ：
    // * ：
    // * ：
    // * ：
    // * ：
    // * ：
    canvas = (function () {
        var _isDown = false, 
        lastPosition, 
        lastPosition_S = {},
        yanse = '#' + ('00000' + (Math.random() * 0x1000000 << 0).toString(16)).slice(-6),
            cuxi = 10,
    device = (/android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(navigator.userAgent.toLowerCase())),
    clickEvtName = device ? 'touchstart' : 'mousedown',
    moveEvtName = device ? 'touchmove' : 'mousemove',
    endEvtName = device ? 'touchend' : 'mouseup',
    canvas, ctx;

$.gevent.subscribe('canvas_cmd_receive', function(json){
    var x =json.x,
            y =json.y,
            color =json.color,
            size =json.size,
            type =json.type,
            drawS =true,
            ID =json.ID,
            canvasW =json.canvasW;
            
    drawP(x, y, color, size, type, drawS, ID, canvasW);
    });

canvas = document.getElementById('myCanvas');
    ctx = canvas.getContext('2d');
    canvas.width = $(window).width();
    canvas.height = $(window).height();
    canvas.style.width = canvas.width + "px";
    canvas.style.height = canvas.height + "px";


$(document).on(clickEvtName, '#myCanvas', mouseDownEvent);
$(document).on(moveEvtName, '#myCanvas', mouseMoveEvent);
$(document).on(endEvtName, '#myCanvas', mouseUpEvent);

function mouseDownEvent(event) {
    event.preventDefault();
    if (device) {
        var touch = event.originalEvent.targetTouches[0];
        x = touch.pageX;
        y = touch.pageY
    } else {
        x = event.clientX;
        y = event.clientY
    }
    _isDown = true;
    drawP(x, y, yanse, cuxi, 1)
}

function mouseMoveEvent(event) {
    event.preventDefault();
    if (_isDown) {
        if (device) {
            var touch = event.originalEvent.targetTouches[0];
            x = touch.pageX;
            y = touch.pageY
        } else {
            x = event.clientX;
            y = event.clientY
        }
        drawP(x, y, yanse, cuxi, 2)
    }
}

function mouseUpEvent(event) {
    event.preventDefault();
    if (_isDown) {
        _isDown = false;
        lastPosition = null
    }
}

        function drawP(x, y, color, size, type, drawS, ID, canvasW) {
            

    //if (!opt) return;
    var tmp = {
        //room: opt, 
       
            canvas: true,
            x: x, 
            y: y, 
            color: color, 
            size: size, 
            type: type, 
            w: canvas.width, 
            h: canvas.height
        };
    //橡皮擦：size<0
    if (size < 0) {
        size = -size;
        ctx.globalCompositeOperation = "destination-out"
    //笔：size>0
    } else if (size > 0) {
        ctx.globalCompositeOperation = "source-over"
    //清空画板：size=0
    } else if (size == 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (!drawS) {
            //将tmp变量广播给其他客户端
            p2p.send('all', JSON.stringify(tmp));
            //socket.emit('drawClick', tmp)
        }
        /*
        var name = '(您自己)';
        if (ID) {
            name = $('#' + ID + ' a').text()
        }
        say(name + "：[清空画布]");
        */
        return
    }
    //保证画板等比例
    if (canvasW) {
        x = (x / canvasW) * canvas.width;
        y = (y / canvasW) * canvas.width;
        size = (size / canvasW) * canvas.width
    }
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.arc(x, y, size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.lineWidth = size;
    ctx.lineCap = ctx.lineJoin = 'round';
    //drwaP函数由服务器触发，即由draw事件调用
    if (drawS) {
        if (type == 1) {
            lastPosition_S[ID] = null;
            //$('#' + ID + ' a').css('color', color)
        }
        if (lastPosition_S[ID]) {
            ctx.moveTo(lastPosition_S[ID][0], lastPosition_S[ID][1]);
            ctx.lineTo(x, y);
            ctx.stroke()
        }
        lastPosition_S[ID] = [x, y];
        return
    }
    
    if (lastPosition) {
        ctx.moveTo(lastPosition[0], lastPosition[1]);
        ctx.lineTo(x, y);
        ctx.stroke()
    }
    lastPosition = [x, y];
    //将tmp变量广播给其他客户端
    p2p.send('all', JSON.stringify(tmp));
    //socket.emit('drawClick', tmp)
}


    }());



    //----------------------公共方法---开始----------------------
    //公共方法/configModule/
    //目的:接收自定义配置
    //参数:键值对对象
    // *
    //返回:true
    configModule = function () {

    };

    //公共方法/initModule/
    //目的:初始化模块
    //参数:DOM对象
    // *
    //返回:true
    initModule = function () {

        return true;
    };

    //返回公共方法
    return {
        configModule: configModule,
        initModule: initModule,
        file: {
            shareFile: file.shareFile,
            sendFileAccept: file.sendFileAccept,
            sendFileRefuse: file.sendFileRefuse
        },
        canvas: {}
    };
    //--------------------公共方法---结束----------------------- 

}());
