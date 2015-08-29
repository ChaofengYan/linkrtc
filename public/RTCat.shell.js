RTCat.shell = (function () {
    //------模块作用域变量---开始--------
    var
        configMap = {
            main_html: String() + '<div></div>',
            settabel_map: {}
        },
        stateMap = {},
        domMap = {},
        setdomMap,
        file = RTCat.model.file,
        p2p = RTCat.p2p;
    //------模块作用域变量---结束--------

    //------DOM操作---开始--------
    setdomMap = function () {
        var $container = stateMap.$container;
        domMap = {
            $container: $container
        };
    };
    //------DOM操作---结束--------

    //------事件处理程序---开始--------
    //订阅事件：
    // * file_receive_complete : 文件接收完成
    // * send_file_accepted : 对方同意接收文件
    // * send_file_refused : 对方拒绝接收文件
    // * send_file : 请求发送文件
    // * sended_file : 文件发送成功
    // * send_file_chunk : 发送文件碎片
    // * receive_file_chunk : 接受文件碎片
    // * receive_file : 接收到文件
    // * send_file_error : 发送文件时出现错误
    // * receive_file_error : 接收文件时出现错误
    // * receive_file_ask : 接受到文件发送请求
    // * stream_created : 创建本地视频流成功
    // * stream_create_error : 创建本地视频流失败
    // * pc_addstream : 接收到其他用户的视频流
    // * remove_peer : 删除其他用户
    // * channel_message : 接收到文字信息
    // * 
    // * 
    // * 

    $.gevent.subscribe('file_receive_complete', function (fileInfo) {
        var
            hyperlink = document.createElement("a"),
            mouseEvent = new MouseEvent('click', {
                view: window,
                bubbles: true,
                cancelable: true
            });
        hyperlink.href = fileInfo.data;
        hyperlink.target = '_blank';
        hyperlink.download = fileInfo.name || dataURL;

        hyperlink.dispatchEvent(mouseEvent);
        (window.URL || window.webkitURL).revokeObjectURL(hyperlink.href);

    });

    //对方同意接收文件
    $.gevent.subscribe("send_file_accepted", function (sendId, socketId, file) {
        var p = document.getElementById("sf-" + sendId);
        p.appendChild(document.createTextNode("对方接收" + file.name + "文件，等待发送"));
        //p.innerText = "对方接收" + file.name + "文件，等待发送";

    });
    //对方拒绝接收文件
    $.gevent.subscribe("send_file_refused", function (sendId, socketId, file) {
        var p = document.getElementById("sf-" + sendId);
        p.appendChild(document.createTextNode("对方拒绝接收" + file.name + "文件"));
        //p.innerText = "对方拒绝接收" + file.name + "文件";
    });
    //请求发送文件
    $.gevent.subscribe('send_file', function (sendId, socketId, file) {
        var p = document.createElement("p");
        p.appendChild(document.createTextNode("请求发送" + file.name + "文件"));
        //p.innerText = "请求发送" + file.name + "文件";
        p.id = "sf-" + sendId;
        files.appendChild(p);
    });
    //文件发送成功
    $.gevent.subscribe('sended_file', function (sendId, socketId, file) {
        var p = document.getElementById("sf-" + sendId);
        p.parentNode.removeChild(p);
    });
    //发送文件碎片
    $.gevent.subscribe('send_file_chunk', function (sendId, socketId, percent, file) {
        var p = document.getElementById("sf-" + sendId);
        p.appendChild(document.createTextNode(file.name + "文件正在发送: " + Math.ceil(percent) + "%"));
        //p.innerText = file.name + "文件正在发送: " + Math.ceil(percent) + "%";
    });
    //接受文件碎片
    $.gevent.subscribe('receive_file_chunk', function (sendId, socketId, fileName, percent) {
        var p = document.getElementById("rf-" + sendId);
        p.appendChild(document.createTextNode("正在接收" + fileName + "文件：" + Math.ceil(percent) + "%"));
        //p.innerText = "正在接收" + fileName + "文件：" + Math.ceil(percent) + "%";
    });
    //接收到文件
    $.gevent.subscribe('receive_file', function (sendId, socketId, name) {
        var p = document.getElementById("rf-" + sendId);
        p.parentNode.removeChild(p);
    });
    //发送文件时出现错误
    $.gevent.subscribe('send_file_error', function (error) {
        console.log(error);
    });
    //接收文件时出现错误
    $.gevent.subscribe('receive_file_error', function (error) {
        console.log(error);
    });

    //接受到文件发送请求
    $.gevent.subscribe('receive_file_ask', function (sendId, socketId, fileName, fileSize) {
        var p;
        if (window.confirm(socketId + "用户想要给你传送" + fileName + "文件，大小" + fileSize + "KB,是否接受？")) {
            file.sendFileAccept(sendId);
            p = document.createElement("p");
            p.appendChild(document.createTextNode("准备接收" + fileName + "文件"));
            //p.innerText = "准备接收" + fileName + "文件";
            p.id = "rf-" + sendId;
            files.appendChild(p);
        } else {
            file.sendFileRefuse(sendId);
        }
    });
    //成功创建WebSocket连接
    $.gevent.subscribe("connected", function (socket) {

    });
	/*
    //创建本地视频流成功
    $.gevent.subscribe("stream_created", function (stream) {
        document.getElementById('me').src = URL.createObjectURL(stream);
        document.getElementById('me').play();
    });
    //创建本地视频流失败
    $.gevent.subscribe("stream_create_error", function () {
        alert("create stream failed!");
    });
	
    //接收到其他用户的视频流
    $.gevent.subscribe('pc_addstream', function (stream, socketId) {
        var newVideo = document.createElement("video"),
            id = "other-" + socketId;
        newVideo.setAttribute("class", "other");
        newVideo.setAttribute("autoplay", "autoplay");
        newVideo.setAttribute("id", id);
        videos.appendChild(newVideo);

        var element = document.getElementById(id);
        if (navigator.mozGetUserMedia) {
            element.mozSrcObject = stream;
            element.play();
        } else {
            element.src = webkitURL.createObjectURL(stream);
        }
        element.src = webkitURL.createObjectURL(stream);

    });
    //删除其他用户
    $.gevent.subscribe('remove_peer', function (socketId) {
        var video = document.getElementById('other-' + socketId);
        if (video) {
            video.parentNode.removeChild(video);
        }
    });
	*/
	
    //接收到文字信息
    $.gevent.subscribe('channel_message', function (channel, socketId, message) {
        var p = document.createElement("p");
        p.appendChild(document.createTextNode(socketId + ": " + message));
        //p.innerText = socketId + ": " + message;
        msgs.appendChild(p);
    });

    //------事件处理程序---结束-------- 

    //------公共方法---开始--------
    //公共方法/configModule/
    //目的:接收自定义配置
    //参数:键值对对象
    // *input_map
    //返回:true
    configModule = function (input_map) {

    };

    //公共方法/initModule/
    //目的:初始化模块
    //参数:DOM对象
    // *$container
    //返回:true
    initModule = function ($container) {
        //        $container.html(configMap.main_html);
        //        stateMap.$container = $container;
        //        setdomMap();
        RTCat.socket.initModule();
        RTCat.p2p.initModule();
        RTCat.model.initModule();
        return true;
    };

    //返回公共方法
    return {
        configModule: configModule,
        initModule: initModule
    };
    //------公共方法---结束-------- 

}());
