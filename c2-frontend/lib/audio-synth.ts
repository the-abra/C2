// Web Audio API Synthesizer for Tactical HUD Notifications
// Completely client-side, zero assets, zero external network dependency

class TacticalAudioSynth {
  private ctx: AudioContext | null = null
  private enabled: boolean = false

  constructor() {
    // Lazy initialize inside user-interaction boundaries
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (AudioCtx) {
        this.ctx = new AudioCtx()
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume()
    }
  }

  public setEnabled(val: boolean) {
    this.enabled = val
    if (val) {
      this.initContext()
    }
  }

  public isEnabled() {
    return this.enabled
  }

  public playVulnAlarm() {
    if (!this.enabled) return
    this.initContext()
    if (!this.ctx) return

    const t = this.ctx.currentTime
    const notes = [293.66, 349.23, 440.00] // D4, F4, A4 (Minor chord warning)

    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator()
      const gain = this.ctx!.createGain()

      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(freq, t + idx * 0.12)
      
      gain.gain.setValueAtTime(0.08, t + idx * 0.12)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + idx * 0.12 + 0.4)

      osc.connect(gain)
      gain.connect(this.ctx!.destination)

      osc.start(t + idx * 0.12)
      osc.stop(t + idx * 0.12 + 0.45)
    })
  }

  public playScanSuccess() {
    if (!this.enabled) return
    this.initContext()
    if (!this.ctx) return

    const t = this.ctx.currentTime
    
    // High-tech dual-click chime
    const freqs = [880.00, 1760.00] // A5 to A6
    freqs.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator()
      const gain = this.ctx!.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, t + idx * 0.08)
      
      gain.gain.setValueAtTime(0.06, t + idx * 0.08)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + idx * 0.08 + 0.25)

      osc.connect(gain)
      gain.connect(this.ctx!.destination)

      osc.start(t + idx * 0.08)
      osc.stop(t + idx * 0.08 + 0.3)
    })
  }

  public playDiscoveryPing() {
    if (!this.enabled) return
    this.initContext()
    if (!this.ctx) return

    const t = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(523.25, t) // C5
    osc.frequency.exponentialRampToValueAtTime(1046.50, t + 0.15) // sweep up to C6

    gain.gain.setValueAtTime(0.04, t)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.2)

    osc.connect(gain)
    gain.connect(this.ctx.destination)

    osc.start(t)
    osc.stop(t + 0.25)
  }
}

export const audioSynth = typeof window !== 'undefined' ? new TacticalAudioSynth() : null
