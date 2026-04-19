import React, { useEffect, useMemo, useState } from 'react';
import { Link2, PlugZap, Unplug } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { Panel } from '../components/shared/Panel';
import { useChronos } from '../lib/chronos-context';
import { IntegrationProvider } from '../types';

const PROVIDER_LABELS: Record<IntegrationProvider, string> = {
  SPOTIFY: 'Spotify',
  JIRA: 'Jira',
};

export function SettingsPage() {
  const {
    settings,
    integrations,
    isGuest,
    updateSettings,
    startIntegrationConnect,
    disconnectIntegration,
  } = useChronos();
  const [searchParams, setSearchParams] = useSearchParams();
  const [form, setForm] = useState(settings);
  const integrationStatus = searchParams.get('integrationStatus');
  const integrationProvider = searchParams.get('integrationProvider');

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  const spotifyAccounts = useMemo(
    () => integrations.filter((integration) => integration.provider === 'SPOTIFY'),
    [integrations],
  );

  async function handleConnect(provider: IntegrationProvider) {
    const redirectUrl = await startIntegrationConnect(provider);
    if (redirectUrl) {
      window.location.assign(redirectUrl);
    }
  }

  function clearIntegrationStatus() {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('integrationStatus');
    nextParams.delete('integrationProvider');
    nextParams.delete('integrationValue');
    setSearchParams(nextParams, { replace: true });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <div className="space-y-6">
        <Panel>
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary">Timer presets</p>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {[
              ['focusMinutes', 'Focus'],
              ['shortBreakMinutes', 'Short break'],
              ['longBreakMinutes', 'Long break'],
            ].map(([field, label]) => (
              <label key={field} className="rounded-2xl border border-outline/10 bg-background p-4">
                <span className="block text-xs uppercase tracking-[0.2em] text-on-surface-variant">{label}</span>
                <input
                  type="number"
                  min={1}
                  className="mt-3 w-full bg-transparent text-4xl font-bold outline-none"
                  value={form[field as keyof typeof form] as number}
                  onChange={(event) => setForm((current) => ({ ...current, [field]: Number(event.target.value) }))}
                />
              </label>
            ))}
          </div>
        </Panel>

        <Panel>
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary">Experience</p>
          <div className="mt-5 space-y-4">
            <label className="flex items-center justify-between rounded-2xl border border-outline/10 bg-background px-4 py-4">
              <span>Desktop notifications</span>
              <input
                type="checkbox"
                checked={form.desktopNotifications}
                onChange={(event) => setForm((current) => ({ ...current, desktopNotifications: event.target.checked }))}
              />
            </label>
            <label className="block rounded-2xl border border-outline/10 bg-background px-4 py-4">
              <span className="block text-xs uppercase tracking-[0.2em] text-on-surface-variant">Theme id</span>
              <input
                className="mt-3 w-full bg-transparent outline-none"
                value={form.theme}
                onChange={(event) => setForm((current) => ({ ...current, theme: event.target.value }))}
              />
            </label>
            <button
              className="w-full rounded-2xl bg-primary px-4 py-4 text-sm font-bold uppercase tracking-[0.25em] text-background"
              onClick={() => void updateSettings({
                focusMinutes: form.focusMinutes,
                shortBreakMinutes: form.shortBreakMinutes,
                longBreakMinutes: form.longBreakMinutes,
                desktopNotifications: form.desktopNotifications,
                theme: form.theme,
              })}
            >
              Save settings
            </button>
          </div>
        </Panel>
      </div>

      <div className="space-y-6">
        <Panel>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-primary">Integrations</p>
              <p className="mt-2 text-sm text-on-surface-variant">
                External accounts stay attached to Chronos users, not to device storage.
              </p>
            </div>
            <Link2 className="h-5 w-5 text-primary" />
          </div>

          {integrationStatus && integrationProvider ? (
            <div className="mt-5 rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span>
                  {integrationStatus === 'connected'
                    ? `${integrationProvider} connected successfully.`
                    : `${integrationProvider} connection returned: ${integrationStatus}.`}
                </span>
                <button className="text-xs uppercase tracking-[0.2em] text-primary" onClick={clearIntegrationStatus}>
                  Clear
                </button>
              </div>
            </div>
          ) : null}

          <div className="mt-5 space-y-4">
            {(['SPOTIFY', 'JIRA'] as IntegrationProvider[]).map((provider) => {
              const providerAccounts = integrations.filter((integration) => integration.provider === provider);
              const isSpotify = provider === 'SPOTIFY';

              return (
                <div key={provider} className="rounded-2xl border border-outline/10 bg-background px-4 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-primary">{PROVIDER_LABELS[provider]}</p>
                      <p className="mt-1 text-sm text-on-surface-variant">
                        {providerAccounts.length === 0
                          ? 'No connected accounts yet.'
                          : `${providerAccounts.length} account${providerAccounts.length === 1 ? '' : 's'} connected.`}
                      </p>
                    </div>
                    {isGuest ? (
                      <span className="text-xs uppercase tracking-[0.2em] text-on-surface-variant">Users only</span>
                    ) : isSpotify ? (
                      <button
                        className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-background"
                        onClick={() => void handleConnect(provider)}
                      >
                        <PlugZap className="h-4 w-4" />
                        Connect
                      </button>
                    ) : (
                      <span className="text-xs uppercase tracking-[0.2em] text-on-surface-variant">Coming soon</span>
                    )}
                  </div>

                  {providerAccounts.length > 0 ? (
                    <div className="mt-4 space-y-3">
                      {providerAccounts.map((account) => (
                        <div key={account.id} className="rounded-2xl border border-outline/10 px-4 py-3">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="font-semibold">{account.displayName ?? account.providerAccountId}</p>
                              <p className="mt-1 text-xs uppercase tracking-[0.2em] text-on-surface-variant">
                                {account.status} • {account.authType}
                              </p>
                            </div>
                            <button
                              className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-primary"
                              onClick={() => void disconnectIntegration(account.id)}
                            >
                              <Unplug className="h-4 w-4" />
                              Disconnect
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          {spotifyAccounts.length > 0 ? (
            <p className="mt-4 text-sm text-on-surface-variant">
              Spotify playlist selection now lives in <span className="font-semibold">Focus</span> and stays local to this browser.
            </p>
          ) : null}
        </Panel>
      </div>
    </div>
  );
}
