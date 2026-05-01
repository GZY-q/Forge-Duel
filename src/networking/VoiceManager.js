const VAD_THRESHOLD = 0.015;
const VAD_INTERVAL_MS = 200;

const DEFAULT_RTC_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" }
  ]
};

export class VoiceManager {
  constructor(networkManager) {
    this.network = networkManager;
    this.localStream = null;
    this.peers = new Map();
    this.audioElements = new Map();
    this.micEnabled = true;
    this.speakerEnabled = true;
    this.isSpeaking = false;
    this.audioContext = null;
    this.analyser = null;
    this.onSpeakingChange = null;
    this.rtcConfig = DEFAULT_RTC_CONFIG;

    this._vadInterval = null;
    this._setupSignaling();
  }

  _setupSignaling() {
    this.network.onVoiceOffer = async (data) => {
      await this._handleOffer(data.fromId, data.sdp);
    };
    this.network.onVoiceAnswer = async (data) => {
      await this._handleAnswer(data.fromId, data.sdp);
    };
    this.network.onVoiceIceCandidate = (data) => {
      this._handleIceCandidate(data.fromId, data.candidate);
    };
    this.network.onVoiceSpeaking = (data) => {
      this.onSpeakingChange?.(data.playerId, data.isSpeaking);
    };
  }

  async startLocalStream() {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false
      });
      this._setupVAD();
      return true;
    } catch (err) {
      console.warn("[Voice] Could not get microphone:", err.message);
      return false;
    }
  }

  _setupVAD() {
    if (!this.localStream) return;

    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = this.audioContext.createMediaStreamSource(this.localStream);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    source.connect(this.analyser);

    const dataArray = new Float32Array(this.analyser.frequencyBinCount);

    this._vadInterval = setInterval(() => {
      if (!this.micEnabled || !this.analyser) return;

      this.analyser.getFloatTimeDomainData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sum / dataArray.length);
      const speaking = rms > VAD_THRESHOLD;

      if (speaking !== this.isSpeaking) {
        this.isSpeaking = speaking;
        this.network.sendVoiceSpeaking(speaking);
        this.onSpeakingChange?.("local", speaking);
      }
    }, VAD_INTERVAL_MS);
  }

  async callPeer(peerId) {
    if (!this.localStream) return;

    const pc = this._createPeerConnection(peerId);

    for (const track of this.localStream.getTracks()) {
      pc.addTrack(track, this.localStream);
    }

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    this.network.sendVoiceOffer(peerId, offer);
  }

  async _handleOffer(fromId, sdp) {
    if (!this.localStream) return;

    let pc = this.peers.get(fromId);
    if (!pc) {
      pc = this._createPeerConnection(fromId);
    }

    await pc.setRemoteDescription(new RTCSessionDescription(sdp));

    for (const track of this.localStream.getTracks()) {
      const senders = pc.getSenders();
      if (!senders.some((s) => s.track === track)) {
        pc.addTrack(track, this.localStream);
      }
    }

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    this.network.sendVoiceAnswer(fromId, answer);
  }

  async _handleAnswer(fromId, sdp) {
    const pc = this.peers.get(fromId);
    if (!pc) return;
    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
  }

  _handleIceCandidate(fromId, candidate) {
    const pc = this.peers.get(fromId);
    if (!pc) return;
    pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
  }

  _createPeerConnection(peerId) {
    const pc = new RTCPeerConnection(this.rtcConfig);
    this.peers.set(peerId, pc);

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        this.network.sendVoiceIceCandidate(peerId, e.candidate);
      }
    };

    pc.ontrack = (e) => {
      this._attachRemoteAudio(peerId, e.streams[0]);
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        this._removePeerAudio(peerId);
      }
    };

    return pc;
  }

  _attachRemoteAudio(peerId, stream) {
    this._removePeerAudio(peerId);

    const audio = new Audio();
    audio.srcObject = stream;
    audio.autoplay = true;
    audio.volume = this.speakerEnabled ? 1 : 0;
    document.body.appendChild(audio);
    this.audioElements.set(peerId, audio);
  }

  _removePeerAudio(peerId) {
    const audio = this.audioElements.get(peerId);
    if (audio) {
      audio.srcObject = null;
      audio.remove();
      this.audioElements.delete(peerId);
    }
  }

  toggleMic() {
    this.micEnabled = !this.micEnabled;
    if (this.localStream) {
      for (const track of this.localStream.getAudioTracks()) {
        track.enabled = this.micEnabled;
      }
    }
    if (!this.micEnabled && this.isSpeaking) {
      this.isSpeaking = false;
      this.network.sendVoiceSpeaking(false);
    }
    return this.micEnabled;
  }

  toggleSpeaker() {
    this.speakerEnabled = !this.speakerEnabled;
    for (const audio of this.audioElements.values()) {
      audio.volume = this.speakerEnabled ? 1 : 0;
    }
    return this.speakerEnabled;
  }

  hangup() {
    if (this._vadInterval) {
      clearInterval(this._vadInterval);
      this._vadInterval = null;
    }

    for (const pc of this.peers.values()) {
      pc.close();
    }
    this.peers.clear();

    for (const audio of this.audioElements.values()) {
      audio.srcObject = null;
      audio.remove();
    }
    this.audioElements.clear();

    if (this.localStream) {
      for (const track of this.localStream.getTracks()) {
        track.stop();
      }
      this.localStream = null;
    }

    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
      this.analyser = null;
    }
  }
}
