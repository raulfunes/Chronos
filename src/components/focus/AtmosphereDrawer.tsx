import React from 'react';
import { CloudRain, LoaderCircle, Pause, Play, Rewind, SkipForward, Waves, Wind, X } from 'lucide-react';
import { FaSpotify } from 'react-icons/fa6';
import { AUDIO_SCOPE_OPTIONS } from '../../lib/focus-session-shared';
import { FocusSessionController } from '../../lib/use-focus-session-controller';
import { AmbientSound, AudioScope, FocusAudioPreferences, Goal, IntegrationAccount, Task } from '../../types';

const AMBIENT_BUTTONS: Array<{ value: AmbientSound; label: string; icon: React.ElementType }> = [
  { value: 'RAIN', label: 'Rain', icon: CloudRain },
  { value: 'RIVER', label: 'River', icon: Waves },
  { value: 'WHITE_NOISE', label: 'White Noise', icon: Wind },
];

interface AtmosphereDrawerProps {
  open: boolean;
  onClose: () => void;
  goals: Goal[];
  linkedTasks: Task[];
  selectedGoalId: string | number;
  selectedTaskId: string | number;
  hasLockedLinking: boolean;
  isGuest: boolean;
  spotifyIntegration: IntegrationAccount | null;
  spotify: FocusSessionController['spotify'];
  focusAudio: FocusAudioPreferences;
  onUpdateFocusAudio: (updates: Partial<FocusAudioPreferences>) => void;
  onSpotifyConnect: () => void | Promise<void>;
  onSelectGoal: (id: '' | number) => void;
  onSelectTask: (id: '' | number) => void;
}

export function AtmosphereDrawer({
  open,
  onClose,
  goals,
  linkedTasks,
  selectedGoalId,
  selectedTaskId,
  hasLockedLinking,
  isGuest,
  spotifyIntegration,
  spotify,
  focusAudio,
  onUpdateFocusAudio,
  onSpotifyConnect,
  onSelectGoal,
  onSelectTask,
}: AtmosphereDrawerProps) {
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30"
          onClick={onClose}
        />
      )}

      <div
        className={`fixed right-0 top-0 z-50 h-full w-[340px] transform border-l border-outline/15 bg-background/95 shadow-[−24px_0_60px_rgba(0,0,0,0.5)] backdrop-blur-2xl transition-transform duration-500 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-outline/10 px-8 py-6">
            <h3 className="font-headline text-lg font-bold">Atmosphere</h3>
            <button
              type="button"
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-on-surface-variant transition hover:bg-surface-high hover:text-on-surface"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="custom-scrollbar flex-1 space-y-8 overflow-y-auto px-8 py-8">
            <section>
              <span className="mb-4 block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                Link Session
              </span>
              <div className="space-y-3">
                <select
                  className="dark-select w-full cursor-pointer rounded-xl border border-outline/10 bg-surface px-4 py-3 text-sm outline-none transition hover:border-primary/20 disabled:cursor-not-allowed disabled:opacity-40"
                  value={selectedGoalId}
                  disabled={hasLockedLinking}
                  onChange={(e) => onSelectGoal(e.target.value === '' ? '' : Number(e.target.value))}
                >
                  <option value="">No goal</option>
                  {goals.map((goal) => (
                    <option key={goal.id} value={goal.id}>{goal.title}</option>
                  ))}
                </select>
                <select
                  className="dark-select w-full cursor-pointer rounded-xl border border-outline/10 bg-surface px-4 py-3 text-sm outline-none transition hover:border-primary/20 disabled:cursor-not-allowed disabled:opacity-40"
                  value={selectedTaskId}
                  disabled={hasLockedLinking}
                  onChange={(e) => onSelectTask(e.target.value === '' ? '' : Number(e.target.value))}
                >
                  <option value="">No task</option>
                  {linkedTasks.map((task) => (
                    <option key={task.id} value={task.id}>{task.title}</option>
                  ))}
                </select>
              </div>
            </section>

            <section>
              <span className="mb-4 block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                Linked Music
              </span>
              {!spotifyIntegration ? (
                <button
                  type="button"
                  disabled={isGuest}
                  className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl bg-[#22d15c] px-4 py-3.5 text-sm font-bold uppercase tracking-[0.2em] text-black shadow-[0_12px_24px_rgba(34,209,92,0.2)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45"
                  onClick={() => void onSpotifyConnect()}
                >
                  <FaSpotify size={18} />
                  {isGuest ? 'Spotify for users only' : 'Connect Spotify'}
                </button>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 rounded-xl border border-outline/10 bg-surface px-4 py-3">
                    <span className="shrink-0 text-[#22d15c]"><FaSpotify size={22} /></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold">Spotify Premium</p>
                      <p className="truncate text-[11px] text-on-surface-variant">
                        {spotifyIntegration.displayName ?? spotifyIntegration.providerAccountId}
                      </p>
                    </div>
                    {(spotify.sdkStatus === 'LOADING' || spotify.sdkStatus === 'CONNECTING' || spotify.isLoadingPlaylists) ? (
                      <LoaderCircle className="h-4 w-4 animate-spin text-primary" />
                    ) : null}
                  </div>

                  <label className="block rounded-xl border border-outline/10 bg-surface px-4 py-3">
                    <span className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                      Focus Playlist
                    </span>
                    <select
                      className="dark-select mt-2 w-full cursor-pointer bg-transparent text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50"
                      value={focusAudio.spotifyPlaylistUri}
                      disabled={spotify.isLoadingPlaylists}
                      onChange={(e) => spotify.handlePlaylistSelection(e.target.value)}
                    >
                      <option value="">{spotify.isLoadingPlaylists ? 'Loading playlists...' : 'Choose a playlist'}</option>
                      {spotify.playlists.map((playlist) => (
                        <option key={playlist.uri} value={playlist.uri}>
                          {playlist.name} • {playlist.ownerName}
                        </option>
                      ))}
                    </select>
                  </label>

                  <button
                    type="button"
                    disabled={!spotify.isReady || spotify.isActivatingPlayer}
                    className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-xs font-bold uppercase tracking-[0.2em] text-primary transition hover:bg-primary/14 disabled:cursor-not-allowed disabled:opacity-45"
                    onClick={() => void spotify.activateBrowserPlayer()}
                  >
                    {spotify.isActivatingPlayer ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 translate-x-[1px]" />}
                    {spotify.isBrowserPlayerActivated ? 'Browser Player Enabled' : 'Enable Browser Player'}
                  </button>

                  <div className="rounded-xl border border-outline/10 bg-surface px-4 py-3">
                    <p className="text-[11px] leading-5 text-on-surface-variant">{spotify.statusText}</p>
                  </div>

                  {spotify.selectedPlaylist ? (
                    <div className="rounded-xl border border-outline/10 bg-surface px-4 py-3">
                      <div className="flex items-center gap-3">
                        {spotify.currentTrack?.albumArtUrl ?? spotify.selectedPlaylist.imageUrl ? (
                          <img
                            src={spotify.currentTrack?.albumArtUrl ?? spotify.selectedPlaylist.imageUrl ?? ''}
                            alt={spotify.currentTrack?.albumName ?? spotify.selectedPlaylist.name}
                            className="h-12 w-12 rounded-xl object-cover"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#22d15c]/12 text-[#22d15c]">
                            <FaSpotify size={18} />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-on-surface">
                            {spotify.currentTrack?.name ?? spotify.selectedPlaylist.name}
                          </p>
                          <p className="truncate text-[11px] text-on-surface-variant">
                            {spotify.currentTrack?.artistNames ?? `${spotify.selectedPlaylist.ownerName} • ${spotify.selectedPlaylist.tracksTotal} tracks`}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          disabled={!spotify.canControlPlayback}
                          className="flex h-10 w-10 items-center justify-center rounded-full border border-outline/10 text-on-surface-variant transition hover:border-primary/20 hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-40"
                          onClick={() => void spotify.skipToPreviousTrack()}
                        >
                          <Rewind className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          disabled={!spotify.canControlPlayback}
                          className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/12 text-primary transition hover:bg-primary/18 disabled:cursor-not-allowed disabled:opacity-40"
                          onClick={() => void spotify.togglePlayback()}
                        >
                          {spotify.isPlaying ? <Pause className="h-4.5 w-4.5" /> : <Play className="h-4.5 w-4.5 translate-x-[1px]" />}
                        </button>
                        <button
                          type="button"
                          disabled={!spotify.canControlPlayback}
                          className="flex h-10 w-10 items-center justify-center rounded-full border border-outline/10 text-on-surface-variant transition hover:border-primary/20 hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-40"
                          onClick={() => void spotify.skipToNextTrack()}
                        >
                          <SkipForward className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </section>

            <section>
              <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-outline/10 bg-surface px-4 py-3 transition hover:border-primary/20">
                <span className="text-sm">Enable session audio</span>
                <input
                  type="checkbox"
                  checked={focusAudio.soundEnabled}
                  onChange={(e) => onUpdateFocusAudio({ soundEnabled: e.target.checked })}
                  className="accent-primary"
                />
              </label>
            </section>

            <section>
              <span className="mb-4 block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                Ambient Soundscape
              </span>
              <div className="grid grid-cols-2 gap-2">
                {AMBIENT_BUTTONS.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    className={`flex flex-col items-center gap-2 rounded-xl p-4 transition ${
                      focusAudio.ambientSound === value
                        ? 'border border-primary/20 bg-primary/10 text-primary'
                        : 'bg-surface text-on-surface-variant hover:bg-surface-high hover:text-on-surface'
                    }`}
                    onClick={() => onUpdateFocusAudio({ ambientSound: value })}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-[10px] font-bold">{label}</span>
                  </button>
                ))}
                <button
                  type="button"
                  className={`flex flex-col items-center gap-2 rounded-xl p-4 transition ${
                    focusAudio.ambientSound === 'NONE'
                      ? 'border border-outline/20 bg-surface-high text-on-surface-variant'
                      : 'bg-surface text-on-surface-variant/40 hover:bg-surface-high hover:text-on-surface-variant'
                  }`}
                  onClick={() => onUpdateFocusAudio({ ambientSound: 'NONE' })}
                >
                  <X className="h-5 w-5" />
                  <span className="text-[10px] font-bold">None</span>
                </button>
              </div>
            </section>

            <section>
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                  Ambient Volume
                </span>
                <span className="text-[10px] font-bold text-on-surface-variant">
                  {focusAudio.ambientVolume}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={focusAudio.ambientVolume}
                onChange={(e) => onUpdateFocusAudio({ ambientVolume: Number(e.target.value) })}
                className="interactive-range w-full accent-primary"
              />
            </section>

            {spotifyIntegration ? (
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    Spotify Volume
                  </span>
                  <span className="text-[10px] font-bold text-on-surface-variant">
                    {focusAudio.spotifyVolume}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={focusAudio.spotifyVolume}
                  onChange={(e) => onUpdateFocusAudio({ spotifyVolume: Number(e.target.value) })}
                  className="interactive-range w-full accent-[#22d15c]"
                />
              </section>
            ) : null}

            <section>
              <label className="block cursor-pointer rounded-xl border border-outline/10 bg-surface px-4 py-3 transition hover:border-primary/20">
                <span className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                  Audio Scope
                </span>
                <select
                  className="dark-select mt-2 w-full cursor-pointer bg-transparent text-sm outline-none"
                  value={focusAudio.audioScope}
                  onChange={(e) => onUpdateFocusAudio({ audioScope: e.target.value as AudioScope })}
                >
                  {AUDIO_SCOPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </label>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
