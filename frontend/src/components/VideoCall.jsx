import React, { useEffect, useRef, useState } from 'react';
import Peer from 'peerjs';
import { FaPhone, FaVideo, FaMicrophone, FaMicrophoneSlash, FaVideoSlash, FaTimes } from 'react-icons/fa';
import { useAuthStore } from '../store/useAuthStore';

const VideoCall = ({ selectedChat, onClose, isReceivingCall, callerInfo }) => {
  const [peer, setPeer] = useState(null);
  const [call, setCall] = useState(null);
  const [stream, setStream] = useState(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isCallStarted, setIsCallStarted] = useState(false);
  const [isCallPending, setIsCallPending] = useState(isReceivingCall || false);
  const [connectionError, setConnectionError] = useState(null);
  const [deviceError, setDeviceError] = useState(null);
  const myVideo = useRef();
  const userVideo = useRef();
  const { authUser, socket } = useAuthStore();

  // Kiểm tra quyền truy cập thiết bị
  const checkDevicePermissions = async () => {
    try {
      // Kiểm tra camera
      const videoDevices = await navigator.mediaDevices.enumerateDevices();
      const hasVideo = videoDevices.some(device => device.kind === 'videoinput');
      
      // Kiểm tra microphone
      const audioDevices = await navigator.mediaDevices.enumerateDevices();
      const hasAudio = audioDevices.some(device => device.kind === 'audioinput');
      
      if (!hasVideo && !hasAudio) {
        setDeviceError('Không tìm thấy camera hoặc microphone. Vui lòng kiểm tra thiết bị.');
        return false;
      } else if (!hasVideo) {
        setDeviceError('Không tìm thấy camera. Vui lòng kiểm tra thiết bị.');
        return false;
      } else if (!hasAudio) {
        setDeviceError('Không tìm thấy microphone. Vui lòng kiểm tra thiết bị.');
        return false;
      }
      
      // Kiểm tra quyền truy cập
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (err) {
      console.error('Permission error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setDeviceError('Quyền truy cập camera/microphone bị từ chối. Vui lòng cấp quyền trong cài đặt trình duyệt.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setDeviceError('Không tìm thấy camera hoặc microphone. Vui lòng kiểm tra thiết bị.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setDeviceError('Camera hoặc microphone đang được sử dụng bởi ứng dụng khác.');
      } else {
        setDeviceError(`Lỗi: ${err.message}`);
      }
      return false;
    }
  };

  useEffect(() => {
    // Kiểm tra quyền truy cập khi component được tạo
    checkDevicePermissions();
    
    // Tạo peer với ID là ID người dùng
    const newPeer = new Peer(authUser._id, {
      host: import.meta.env.VITE_PEER_HOST || 'localhost',
      port: import.meta.env.VITE_PEER_PORT || 3001,
      path: '/',
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' },
          // Thêm TURN server nếu cần
          // {
          //   urls: 'turn:your-turn-server.com:3478',
          //   username: 'username',
          //   credential: 'credential'
          // }
        ]
      }
    });

    newPeer.on('open', (id) => {
      console.log('My peer ID is: ' + id);
    });

    newPeer.on('call', (incomingCall) => {
      setIsCallPending(true);
      setCall(incomingCall);
    });

    newPeer.on('error', (err) => {
      console.error('PeerJS error:', err);
      setConnectionError(err.message);
    });

    newPeer.on('connection', (conn) => {
      console.log('Connected to peer:', conn.peer);
    });

    setPeer(newPeer);

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      newPeer.destroy();
    };
  }, [authUser._id]);

  // Tự động gọi khi component được tạo (nếu không phải là người nhận cuộc gọi)
  useEffect(() => {
    if (!isReceivingCall && selectedChat && peer) {
      startCall();
    }
  }, [peer, selectedChat, isReceivingCall]);

  const startCall = async () => {
    try {
      // Kiểm tra quyền truy cập trước khi bắt đầu cuộc gọi
      const hasPermission = await checkDevicePermissions();
      if (!hasPermission) {
        return;
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(stream);
      myVideo.current.srcObject = stream;

      // Gửi thông báo cuộc gọi qua socket
      socket.emit('call-user', {
        userToCall: selectedChat._id,
        from: authUser._id,
        name: authUser.fullName
      });

      const call = peer.call(selectedChat._id, stream);
      
      call.on('stream', (remoteStream) => {
        userVideo.current.srcObject = remoteStream;
      });
      
      call.on('error', (err) => {
        console.error('Call error:', err);
        setConnectionError(err.message);
      });
      
      setCall(call);
      setIsCallStarted(true);
      setIsCallPending(false);
    } catch (err) {
      console.error('Failed to get local stream', err);
      setConnectionError('Không thể truy cập camera hoặc microphone. Vui lòng kiểm tra quyền truy cập.');
    }
  };

  const answerCall = async () => {
    try {
      // Kiểm tra quyền truy cập trước khi trả lời cuộc gọi
      const hasPermission = await checkDevicePermissions();
      if (!hasPermission) {
        return;
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(stream);
      myVideo.current.srcObject = stream;
      
      call.answer(stream);
      call.on('stream', (remoteStream) => {
        userVideo.current.srcObject = remoteStream;
      });
      
      call.on('error', (err) => {
        console.error('Call error:', err);
        setConnectionError(err.message);
      });
      
      setIsCallStarted(true);
      setIsCallPending(false);
    } catch (err) {
      console.error('Failed to get local stream', err);
      setConnectionError('Không thể truy cập camera hoặc microphone. Vui lòng kiểm tra quyền truy cập.');
    }
  };

  const endCall = () => {
    // Gửi thông báo kết thúc cuộc gọi
    socket.emit('end-call', {
      user: selectedChat?._id || callerInfo?.id
    });

    if (call) {
      call.close();
      setCall(null);
    }
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (myVideo.current) {
      myVideo.current.srcObject = null;
    }
    if (userVideo.current) {
      userVideo.current.srcObject = null;
    }
    setIsCallStarted(false);
    onClose();
  };

  const toggleAudio = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setIsAudioMuted(!isAudioMuted);
    }
  };

  const toggleVideo = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoOff(!isVideoOff);
    }
  };

  const rejectCall = () => {
    // Gửi thông báo từ chối cuộc gọi
    socket.emit('reject-call', {
      caller: callerInfo?.id
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col">
      {/* Main video container */}
      <div className="flex-1 relative">
        {/* Remote video (full screen) */}
        <div className="absolute inset-0">
          <video
            ref={userVideo}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        </div>

        {/* Local video (small overlay) */}
        <div className="absolute bottom-4 right-4 w-48 h-36 rounded-lg overflow-hidden shadow-lg border-2 border-white">
          <video
            ref={myVideo}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        </div>

        {/* User name overlay */}
        <div className="absolute top-4 left-4 text-white text-xl font-semibold">
          {isReceivingCall ? callerInfo?.name : selectedChat?.fullName}
        </div>

        {/* Error message */}
        {(connectionError || deviceError) && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-red-500 text-white p-4 rounded-lg max-w-md text-center">
            <p className="mb-2">{deviceError || connectionError}</p>
            <div className="flex flex-col gap-2 mt-4">
              <button 
                onClick={endCall}
                className="btn btn-sm btn-white"
              >
                Đóng
              </button>
              <button 
                onClick={checkDevicePermissions}
                className="btn btn-sm btn-outline btn-white"
              >
                Kiểm tra lại thiết bị
              </button>
            </div>
          </div>
        )}

        {/* Call status */}
        {isCallPending && !isCallStarted && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white text-center">
            {isReceivingCall ? (
              <>
                <div className="text-2xl mb-4">{callerInfo?.name} đang gọi cho bạn...</div>
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={rejectCall}
                    className="btn btn-error btn-lg"
                  >
                    Từ chối
                  </button>
                  <button
                    onClick={answerCall}
                    className="btn btn-success btn-lg"
                  >
                    Trả lời
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl mb-4">Đang gọi {selectedChat?.fullName}...</div>
                <button
                  onClick={endCall}
                  className="btn btn-error btn-lg"
                >
                  Hủy cuộc gọi
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Controls (chỉ hiển thị khi cuộc gọi đã bắt đầu) */}
      {isCallStarted && (
        <div className="h-24 bg-black bg-opacity-50 flex items-center justify-center gap-8">
          <button
            onClick={toggleAudio}
            className={`w-14 h-14 rounded-full flex items-center justify-center ${
              isAudioMuted ? 'bg-red-500' : 'bg-gray-600'
            }`}
          >
            {isAudioMuted ? <FaMicrophoneSlash className="text-2xl text-white" /> : <FaMicrophone className="text-2xl text-white" />}
          </button>
          <button
            onClick={endCall}
            className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center"
          >
            <FaPhone className="text-2xl text-white rotate-135" />
          </button>
          <button
            onClick={toggleVideo}
            className={`w-14 h-14 rounded-full flex items-center justify-center ${
              isVideoOff ? 'bg-red-500' : 'bg-gray-600'
            }`}
          >
            {isVideoOff ? <FaVideoSlash className="text-2xl text-white" /> : <FaVideo className="text-2xl text-white" />}
          </button>
        </div>
      )}
    </div>
  );
};

export default VideoCall;