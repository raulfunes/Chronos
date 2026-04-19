import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FocusAudioPreferences,
  IntegrationAccount,
  IntegrationTokenRefreshResponse,
  SessionType,
} from '../types';

const SPOTIFY_SDK_URL = 'https://sdk.scdn.co/spotify-player.js';
const SPOTIFY_API_BASE_URL = 'https://api.spotify.com/v1';
const PLAYER_TRANSFER_DELAY_MS = 180;
const TOKEN_REFRESH_MARGIN_MS = 60_000;
const MAX_PLAYLIST_PAGES = 3;

let spotifySdkPromise: Promise<void> | null = null;

export type SpotifySdkStatus = 'IDLE' | 'LOADING' | 'CONNECTING' | 'READY' | 'OFFLINE' | 'ERROR';

export interface SpotifyPlaylistOption {
  id: string;
  name: string;
  uri: string;
  ownerName: string;
  imageUrl: string | null;
  tracksTotal: number;
  externalUrl: string | null;
}

export interface SpotifyCurrentTrack {
  uri: string;
  name: string;
  artistNames: string;
  albumName: string;
  albumArtUrl: string | null;
  contextUri: string | null;
  durationMs: number;
  positionMs: number;
  isPaused: boolean;
}

interface UseSpotifyPlaybackArgs {
  integration: IntegrationAccount | null;
  focusAudio: FocusAudioPreferences;
  activeSessionType: SessionType | null;
  updateFocusAudio(payload: Partial<FocusAudioPreferences>): void;
  refreshIntegrationToken(accountId: number): Promise<IntegrationTokenRefreshResponse | null>;
  showError(message: string): void;
}

interface SpotifyPlaylistPageResponse {
  items: Array<{
    id: string;
    name: string;
    uri: string;
    images?: Array<{ url: string }>;
    owner?: { display_name?: string | null };
    tracks?: { total?: number | null };
    external_urls?: { spotify?: string | null };
  }>;
  next: string | null;
}

function clampSpotifyVolume(value: number) {
  return Math.min(1, Math.max(0, value / 100));
}

function formatSpotifyError(prefix: string, error: unknown) {
  const message = error instanceof Error ? error.message : 'Request failed';
  return `${prefix}: ${message}`;
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function shouldPlaySpotifyForSession(
  type: SessionType,
  scope: FocusAudioPreferences['audioScope'],
) {
  return scope === 'ALL_SESSIONS' || type === 'POMODORO';
}

function normalizeSpotifyState(state: Spotify.PlaybackState | null): SpotifyCurrentTrack | null {
  if (!state?.track_window.current_track) {
    return null;
  }

  const currentTrack = state.track_window.current_track;
  return {
    uri: currentTrack.uri,
    name: currentTrack.name,
    artistNames: currentTrack.artists.map((artist) => artist.name).join(', '),
    albumName: currentTrack.album.name,
    albumArtUrl: currentTrack.album.images[0]?.url ?? null,
    contextUri: state.context?.uri ?? null,
    durationMs: state.duration,
    positionMs: state.position,
    isPaused: state.paused,
  };
}

function loadSpotifySdk() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Spotify playback is only available in the browser'));
  }

  if (window.Spotify?.Player) {
    return Promise.resolve();
  }

  if (spotifySdkPromise) {
    return spotifySdkPromise;
  }

  spotifySdkPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector(`script[src="${SPOTIFY_SDK_URL}"]`) as HTMLScriptElement | null;
    const script = existingScript ?? document.createElement('script');
    const previousReady = window.onSpotifyWebPlaybackSDKReady;

    function cleanup() {
      script.removeEventListener('error', handleError);
      script.removeEventListener('load', handleLoad);
    }

    function handleLoad() {
      if (window.Spotify?.Player) {
        cleanup();
        resolve();
      }
    }

    function handleError() {
      cleanup();
      spotifySdkPromise = null;
      reject(new Error('Failed to load Spotify Web Playback SDK'));
    }

    window.onSpotifyWebPlaybackSDKReady = () => {
      previousReady?.();
      cleanup();
      resolve();
    };

    script.addEventListener('error', handleError, { once: true });
    script.addEventListener('load', handleLoad, { once: true });

    if (!existingScript) {
      script.src = SPOTIFY_SDK_URL;
      script.async = true;
      document.body.appendChild(script);
    }
  });

  return spotifySdkPromise;
}

async function spotifyRequest<T>(
  accessToken: string,
  pathOrUrl: string,
  init: RequestInit = {},
) {
  const response = await fetch(
    pathOrUrl.startsWith('http') ? pathOrUrl : `${SPOTIFY_API_BASE_URL}${pathOrUrl}`,
    {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(init.headers ?? {}),
      },
    },
  );

  if (!response.ok) {
    let message = 'Spotify request failed';

    try {
      const body = await response.json() as { error?: { message?: string } };
      if (typeof body.error?.message === 'string' && body.error.message.trim()) {
        message = body.error.message;
      }
    } catch {
      const text = await response.text().catch(() => '');
      if (text.trim()) {
        message = text;
      }
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return null as T;
  }

  return await response.json() as T;
}

async function fetchUserPlaylists(accessToken: string) {
  const playlists: SpotifyPlaylistOption[] = [];
  let nextUrl: string | null = `${SPOTIFY_API_BASE_URL}/me/playlists?limit=50`;
  let pageCount = 0;

  while (nextUrl && pageCount < MAX_PLAYLIST_PAGES) {
    const page = await spotifyRequest<SpotifyPlaylistPageResponse>(accessToken, nextUrl);
    playlists.push(...page.items
      .filter((playlist) => playlist.id && playlist.uri && playlist.name)
      .map((playlist) => ({
        id: playlist.id,
        name: playlist.name,
        uri: playlist.uri,
        ownerName: playlist.owner?.display_name?.trim() || 'Spotify',
        imageUrl: playlist.images?.[0]?.url ?? null,
        tracksTotal: playlist.tracks?.total ?? 0,
        externalUrl: playlist.external_urls?.spotify ?? null,
      })));
    nextUrl = page.next;
    pageCount += 1;
  }

  return playlists;
}

export function useSpotifyPlayback({
  integration,
  focusAudio,
  activeSessionType,
  updateFocusAudio,
  refreshIntegrationToken,
  showError,
}: UseSpotifyPlaybackArgs) {
  const integrationRef = useRef(integration);
  const refreshIntegrationTokenRef = useRef(refreshIntegrationToken);
  const showErrorRef = useRef(showError);
  const playerRef = useRef<Spotify.Player | null>(null);
  const accessTokenRef = useRef<string | null>(null);
  const accessTokenExpiresAtRef = useRef<number>(0);
  const lastAutoPlaybackKeyRef = useRef<string | null>(null);
  const [sdkStatus, setSdkStatus] = useState<SpotifySdkStatus>('IDLE');
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [isActivatingPlayer, setIsActivatingPlayer] = useState(false);
  const [isBrowserPlayerActivated, setIsBrowserPlayerActivated] = useState(false);
  const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(false);
  const [playlists, setPlaylists] = useState<SpotifyPlaylistOption[]>([]);
  const [currentTrack, setCurrentTrack] = useState<SpotifyCurrentTrack | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  integrationRef.current = integration;
  refreshIntegrationTokenRef.current = refreshIntegrationToken;
  showErrorRef.current = showError;

  const selectedPlaylist = useMemo(() => {
    if (!focusAudio.spotifyPlaylistUri) {
      return null;
    }

    const matched = playlists.find((playlist) => playlist.uri === focusAudio.spotifyPlaylistUri);
    if (matched) {
      return matched;
    }

    return {
      id: focusAudio.spotifyPlaylistUri,
      name: focusAudio.spotifyPlaylistName || 'Saved playlist',
      uri: focusAudio.spotifyPlaylistUri,
      ownerName: 'Spotify',
      imageUrl: null,
      tracksTotal: 0,
      externalUrl: null,
    } satisfies SpotifyPlaylistOption;
  }, [focusAudio.spotifyPlaylistName, focusAudio.spotifyPlaylistUri, playlists]);

  const playlistOptions = useMemo(() => {
    if (!selectedPlaylist) {
      return playlists;
    }

    return playlists.some((playlist) => playlist.uri === selectedPlaylist.uri)
      ? playlists
      : [selectedPlaylist, ...playlists];
  }, [playlists, selectedPlaylist]);

  const shouldAutoPlay = Boolean(
    activeSessionType
      && focusAudio.soundEnabled
      && focusAudio.spotifyPlaylistUri
      && shouldPlaySpotifyForSession(activeSessionType, focusAudio.audioScope),
  );

  async function getValidAccessToken(forceRefresh = false) {
    const currentIntegration = integrationRef.current;
    if (!currentIntegration) {
      return null;
    }

    if (
      !forceRefresh
      && accessTokenRef.current
      && Date.now() < accessTokenExpiresAtRef.current - TOKEN_REFRESH_MARGIN_MS
    ) {
      return accessTokenRef.current;
    }

    const response = await refreshIntegrationTokenRef.current(currentIntegration.id);
    if (!response?.accessToken) {
      throw new Error('Chronos could not refresh the Spotify access token');
    }

    accessTokenRef.current = response.accessToken;
    accessTokenExpiresAtRef.current = new Date(response.expiresAt).getTime();
    return response.accessToken;
  }

  async function transferPlaybackToBrowser(accessToken: string, targetDeviceId: string) {
    await spotifyRequest<void>(accessToken, '/me/player', {
      method: 'PUT',
      body: JSON.stringify({
        device_ids: [targetDeviceId],
        play: false,
      }),
    });
  }

  async function startSelectedPlaylistPlayback() {
    if (!deviceId || !focusAudio.spotifyPlaylistUri) {
      return;
    }

    const player = playerRef.current;
    if (!player) {
      throw new Error('Spotify browser player is not ready yet');
    }

    const state = await player.getCurrentState().catch(() => null);
    if (state && state.context?.uri === focusAudio.spotifyPlaylistUri) {
      if (state.paused) {
        await player.togglePlay();
      }
      return;
    }

    const accessToken = await getValidAccessToken();
    if (!accessToken) {
      throw new Error('Spotify access token is unavailable');
    }

    await transferPlaybackToBrowser(accessToken, deviceId);
    await sleep(PLAYER_TRANSFER_DELAY_MS);
    await spotifyRequest<void>(accessToken, `/me/player/play?device_id=${encodeURIComponent(deviceId)}`, {
      method: 'PUT',
      body: JSON.stringify({
        context_uri: focusAudio.spotifyPlaylistUri,
      }),
    });
  }

  async function activateBrowserPlayer() {
    const player = playerRef.current;
    if (!player) {
      throw new Error('Spotify browser player is still loading');
    }

    setIsActivatingPlayer(true);
    try {
      await player.activateElement();
      setIsBrowserPlayerActivated(true);
      setStatusMessage(null);
    } finally {
      setIsActivatingPlayer(false);
    }
  }

  async function togglePlayback() {
    const player = playerRef.current;
    if (!player) {
      showErrorRef.current('Spotify browser player is still loading');
      return;
    }

    try {
      if (!isBrowserPlayerActivated) {
        await activateBrowserPlayer();
      }

      const state = await player.getCurrentState().catch(() => null);
      if (state?.track_window.current_track) {
        await player.togglePlay();
        return;
      }

      if (!focusAudio.spotifyPlaylistUri) {
        showErrorRef.current('Choose a Spotify playlist first');
        return;
      }

      await startSelectedPlaylistPlayback();
    } catch (error) {
      const message = formatSpotifyError('Spotify playback failed', error);
      setStatusMessage(message);
      showErrorRef.current(message);
    }
  }

  async function skipToNextTrack() {
    if (!playerRef.current) {
      return;
    }

    try {
      if (!isBrowserPlayerActivated) {
        await activateBrowserPlayer();
      }
      await playerRef.current.nextTrack();
    } catch (error) {
      const message = formatSpotifyError('Spotify could not skip to the next track', error);
      setStatusMessage(message);
      showErrorRef.current(message);
    }
  }

  async function skipToPreviousTrack() {
    if (!playerRef.current) {
      return;
    }

    try {
      if (!isBrowserPlayerActivated) {
        await activateBrowserPlayer();
      }
      await playerRef.current.previousTrack();
    } catch (error) {
      const message = formatSpotifyError('Spotify could not go back to the previous track', error);
      setStatusMessage(message);
      showErrorRef.current(message);
    }
  }

  function handlePlaylistSelection(nextPlaylistUri: string) {
    if (!nextPlaylistUri) {
      updateFocusAudio({
        spotifyPlaylistUri: '',
        spotifyPlaylistName: '',
      });
      return;
    }

    const selected = playlistOptions.find((playlist) => playlist.uri === nextPlaylistUri);
    updateFocusAudio({
      spotifyPlaylistUri: nextPlaylistUri,
      spotifyPlaylistName: selected?.name ?? focusAudio.spotifyPlaylistName,
    });
  }

  useEffect(() => {
    const player = playerRef.current;
    playerRef.current = null;
    player?.disconnect();
    accessTokenRef.current = null;
    accessTokenExpiresAtRef.current = 0;
    lastAutoPlaybackKeyRef.current = null;
    setDeviceId(null);
    setCurrentTrack(null);
    setStatusMessage(null);
    setIsBrowserPlayerActivated(false);

    if (!integration) {
      setSdkStatus('IDLE');
      setPlaylists([]);
      return;
    }

    let disposed = false;

    void (async () => {
      setSdkStatus('LOADING');

      try {
        await loadSpotifySdk();
        if (disposed || !window.Spotify?.Player) {
          return;
        }

        const spotifyPlayer = new window.Spotify.Player({
          name: 'Chronos Focus Player',
          enableMediaSession: true,
          volume: clampSpotifyVolume(focusAudio.spotifyVolume),
          getOAuthToken: (callback) => {
            void getValidAccessToken()
              .then((token) => callback(token ?? ''))
              .catch((error) => {
                const message = formatSpotifyError('Spotify authentication failed', error);
                setSdkStatus('ERROR');
                setStatusMessage(message);
                showErrorRef.current(message);
                callback('');
              });
          },
        });

        playerRef.current = spotifyPlayer;

        spotifyPlayer.addListener('ready', ({ device_id }) => {
          if (disposed) {
            return;
          }

          setDeviceId(device_id);
          setSdkStatus('READY');
          setStatusMessage(null);
          void spotifyPlayer.setVolume(clampSpotifyVolume(focusAudio.spotifyVolume));
          void spotifyPlayer.getCurrentState().then((state) => {
            if (!disposed) {
              setCurrentTrack(normalizeSpotifyState(state));
            }
          });
        });

        spotifyPlayer.addListener('not_ready', () => {
          if (disposed) {
            return;
          }

          setSdkStatus('OFFLINE');
          setDeviceId(null);
        });

        spotifyPlayer.addListener('player_state_changed', (state) => {
          if (disposed) {
            return;
          }

          setCurrentTrack(normalizeSpotifyState(state));
        });

        spotifyPlayer.addListener('initialization_error', ({ message }) => {
          if (disposed) {
            return;
          }

          const formattedMessage = `Spotify could not initialize in this browser: ${message}`;
          setSdkStatus('ERROR');
          setStatusMessage(formattedMessage);
          showErrorRef.current(formattedMessage);
        });

        spotifyPlayer.addListener('authentication_error', ({ message }) => {
          if (disposed) {
            return;
          }

          const formattedMessage = `Spotify authentication failed: ${message}`;
          setSdkStatus('ERROR');
          setStatusMessage(formattedMessage);
          showErrorRef.current(formattedMessage);
        });

        spotifyPlayer.addListener('account_error', ({ message }) => {
          if (disposed) {
            return;
          }

          const formattedMessage = `Spotify Premium is required for browser playback: ${message}`;
          setSdkStatus('ERROR');
          setStatusMessage(formattedMessage);
          showErrorRef.current(formattedMessage);
        });

        spotifyPlayer.addListener('playback_error', ({ message }) => {
          if (disposed) {
            return;
          }

          const formattedMessage = `Spotify playback failed: ${message}`;
          setStatusMessage(formattedMessage);
          showErrorRef.current(formattedMessage);
        });

        spotifyPlayer.addListener('autoplay_failed', () => {
          if (disposed) {
            return;
          }

          const formattedMessage = 'Enable the browser player once so Spotify can keep playback in this tab.';
          setStatusMessage(formattedMessage);
          showErrorRef.current(formattedMessage);
        });

        setSdkStatus('CONNECTING');
        const success = await spotifyPlayer.connect();
        if (!success && !disposed) {
          throw new Error('Spotify browser player rejected the connection');
        }
      } catch (error) {
        if (disposed) {
          return;
        }

        const message = formatSpotifyError('Spotify setup failed', error);
        setSdkStatus('ERROR');
        setStatusMessage(message);
        showErrorRef.current(message);
      }
    })();

    return () => {
      disposed = true;
      playerRef.current?.disconnect();
      playerRef.current = null;
    };
  }, [integration?.id]);

  useEffect(() => {
    if (!integration) {
      return;
    }

    let cancelled = false;

    void (async () => {
      setIsLoadingPlaylists(true);
      try {
        const accessToken = await getValidAccessToken();
        if (!accessToken || cancelled) {
          return;
        }

        const userPlaylists = await fetchUserPlaylists(accessToken);
        if (!cancelled) {
          setPlaylists(userPlaylists);
        }
      } catch (error) {
        if (!cancelled) {
          const message = formatSpotifyError('Spotify playlists failed to load', error);
          setStatusMessage(message);
          showErrorRef.current(message);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingPlaylists(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [integration?.id]);

  useEffect(() => {
    if (!playerRef.current || sdkStatus !== 'READY') {
      return;
    }

    void playerRef.current.setVolume(clampSpotifyVolume(focusAudio.spotifyVolume));
  }, [focusAudio.spotifyVolume, sdkStatus]);

  useEffect(() => {
    const player = playerRef.current;
    const autoPlaybackKey = shouldAutoPlay && deviceId
      ? `${deviceId}:${focusAudio.spotifyPlaylistUri}:${activeSessionType}`
      : null;

    let cancelled = false;

    if (!player || !deviceId) {
      return;
    }

    if (!shouldAutoPlay) {
      lastAutoPlaybackKeyRef.current = null;

      void player.getCurrentState()
        .then(async (state) => {
          if (cancelled || !state || state.paused) {
            return;
          }
          await player.togglePlay();
        })
        .catch(() => {});
      return () => {
        cancelled = true;
      };
    }

    if (!focusAudio.spotifyPlaylistUri || !isBrowserPlayerActivated) {
      return;
    }

    if (autoPlaybackKey && lastAutoPlaybackKeyRef.current === autoPlaybackKey) {
      return;
    }

    void startSelectedPlaylistPlayback()
      .then(() => {
        if (!cancelled) {
          lastAutoPlaybackKeyRef.current = autoPlaybackKey;
          setStatusMessage(null);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          const message = formatSpotifyError('Spotify playback failed', error);
          setStatusMessage(message);
          showErrorRef.current(message);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    activeSessionType,
    deviceId,
    focusAudio.audioScope,
    focusAudio.soundEnabled,
    focusAudio.spotifyPlaylistUri,
    isBrowserPlayerActivated,
    shouldAutoPlay,
  ]);

  const statusText = useMemo(() => {
    if (!integration) {
      return 'Connect Spotify to stream a playlist inside Chronos.';
    }

    if (statusMessage) {
      return statusMessage;
    }

    if (isLoadingPlaylists) {
      return 'Loading your Spotify playlists...';
    }

    if (!focusAudio.spotifyPlaylistUri) {
      return 'Choose a playlist to use during focus sessions.';
    }

    if (sdkStatus === 'LOADING' || sdkStatus === 'CONNECTING') {
      return 'Connecting the Spotify browser player...';
    }

    if (sdkStatus === 'OFFLINE') {
      return 'Spotify browser player went offline. Reopen the page if this keeps happening.';
    }

    if (!isBrowserPlayerActivated) {
      return 'Enable the browser player once. Spotify requires a user gesture in some browsers.';
    }

    if (currentTrack) {
      return currentTrack.isPaused
        ? `Paused on ${currentTrack.name}`
        : `Playing ${currentTrack.name}`;
    }

    if (shouldAutoPlay) {
      return 'Focus audio is active. Start playback if Spotify did not resume automatically.';
    }

    return 'Spotify browser player is ready.';
  }, [
    currentTrack,
    focusAudio.spotifyPlaylistUri,
    integration,
    isBrowserPlayerActivated,
    isLoadingPlaylists,
    sdkStatus,
    shouldAutoPlay,
    statusMessage,
  ]);

  return {
    sdkStatus,
    playlists: playlistOptions,
    selectedPlaylist,
    currentTrack,
    isLoadingPlaylists,
    isBrowserPlayerActivated,
    isActivatingPlayer,
    isReady: sdkStatus === 'READY',
    isPlaying: Boolean(currentTrack && !currentTrack.isPaused),
    canControlPlayback: sdkStatus === 'READY' && Boolean(deviceId) && Boolean(focusAudio.spotifyPlaylistUri),
    statusText,
    activateBrowserPlayer,
    togglePlayback,
    skipToNextTrack,
    skipToPreviousTrack,
    handlePlaylistSelection,
  };
}
