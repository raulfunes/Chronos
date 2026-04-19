/// <reference types="vite/client" />

declare global {
  interface Window {
    Spotify?: {
      Player: new (options: Spotify.PlayerInit) => Spotify.Player;
    };
    onSpotifyWebPlaybackSDKReady?: () => void;
  }

  namespace Spotify {
    interface PlayerInit {
      name: string;
      getOAuthToken(callback: (accessToken: string) => void): void;
      volume?: number;
      enableMediaSession?: boolean;
    }

    interface PlayerError {
      message: string;
    }

    interface PlayerReadyPayload {
      device_id: string;
    }

    interface TrackArtist {
      name: string;
      uri: string;
    }

    interface TrackImage {
      url: string;
    }

    interface TrackAlbum {
      name: string;
      uri: string;
      images: TrackImage[];
    }

    interface Track {
      uri: string;
      name: string;
      duration_ms: number;
      album: TrackAlbum;
      artists: TrackArtist[];
    }

    interface TrackWindow {
      current_track: Track;
      previous_tracks: Track[];
      next_tracks: Track[];
    }

    interface PlaybackContext {
      uri: string | null;
      metadata: Record<string, string>;
    }

    interface PlaybackState {
      paused: boolean;
      position: number;
      duration: number;
      track_window: TrackWindow;
      context: PlaybackContext | null;
    }

    type PlayerListener = (...args: any[]) => void;

    interface Player {
      addListener(eventName: string, callback: PlayerListener): boolean;
      removeListener(eventName: string, callback?: PlayerListener): boolean;
      connect(): Promise<boolean>;
      disconnect(): void;
      activateElement(): Promise<void>;
      getCurrentState(): Promise<PlaybackState | null>;
      setVolume(volume: number): Promise<void>;
      togglePlay(): Promise<void>;
      nextTrack(): Promise<void>;
      previousTrack(): Promise<void>;
    }
  }
}

export {};
