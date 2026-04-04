'use client';

import { TopBar } from '@worldcoin/mini-apps-ui-kit-react';
import { NavArrowLeft } from 'iconoir-react';
import { LoadingSpinner, SuccessState } from '@/components/LoadingState';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { haptic } from '@/lib/haptics';
import { getWorldIdProof, EMPTY_PROOF } from '@/lib/worldid';
import { useContract } from '@/hooks/useContract';
import { Page } from '@/components/PageLayout';

const STEPS = ['Name', 'Buy-in', 'Players', 'Capital', 'Start', 'Duration'];

const BUYIN_PRESETS = [5, 10, 25, 50, 100, 250];
const CAPITAL_PRESETS = [500, 1000, 5000, 10000, 50000, 100000];

const START_PRESETS = [
  { label: '5 min', minutes: 5 },
  { label: '15 min', minutes: 15 },
  { label: '1 hour', minutes: 60 },
  { label: '6 hours', minutes: 360 },
  { label: '1 day', minutes: 1440 },
  { label: '1 week', minutes: 10080 },
];

const DURATION_PRESETS = [
  { label: '1 hour', minutes: 60 },
  { label: '3 hours', minutes: 180 },
  { label: '6 hours', minutes: 360 },
  { label: '12 hours', minutes: 720 },
  { label: '1 day', minutes: 1440 },
  { label: '3 days', minutes: 4320 },
];

function formatCapital(v: number): string {
  return `$${v.toLocaleString('en-US')}`;
}

function formatStartTime(minutes: number): string {
  if (minutes === 0) return 'Starts immediately';
  const date = new Date(Date.now() + minutes * 60000);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  if (isToday) return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  return `${date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 1440) return `${minutes / 60} hour${minutes > 60 ? 's' : ''}`;
  return `${minutes / 1440} day${minutes > 1440 ? 's' : ''}`;
}

export default function CreateGamePage() {
  const router = useRouter();
  const { createGame } = useContract();
  const [step, setStep] = useState(0);
  const [gameName, setGameName] = useState('');
  const [buyIn, setBuyIn] = useState('10');
  const [maxPlayers, setMaxPlayers] = useState(10);
  const [startingCapital, setStartingCapital] = useState(5000);
  const [customCapital, setCustomCapital] = useState('');
  const [startDelay, setStartDelay] = useState(15);
  const [duration, setDuration] = useState(180);
  const [state, setState] = useState<'idle' | 'pending' | 'success'>('idle');

  const buyInNum = Number(buyIn) || 0;
  const totalSteps = STEPS.length;

  const canNext =
    step === 0 ? gameName.trim().length > 0 :
    step === 1 ? buyInNum > 0 :
    step === 2 ? maxPlayers >= 2 :
    step === 3 ? (customCapital ? Number(customCapital) >= 100 : startingCapital >= 100) :
    step === 4 ? startDelay >= 5 :
    duration > 0;

  const handleNext = () => {
    haptic.light();
    if (step < totalSteps - 1) {
      setStep(step + 1);
    } else {
      handleCreate();
    }
  };

  const handleBack = () => {
    haptic.selection();
    if (step > 0) setStep(step - 1);
    else router.back();
  };

  const handleCreate = async () => {
    haptic.medium();

    try {
      // World ID verification — fallback to empty proof if verification fails
      let worldIdProof = EMPTY_PROOF;
      try {
        worldIdProof = await getWorldIdProof('create-game', '');
      } catch {
        console.warn('World ID verification skipped');
      }

      // Step 2: Now show spinner while tx is processing
      setState('pending');

      const capital = customCapital ? Number(customCapital) : startingCapital;
      const startTime = BigInt(Math.floor(Date.now() / 1000) + startDelay * 60);
      const endTime = BigInt(Math.floor(Date.now() / 1000) + startDelay * 60 + duration * 60);
      const entryAmountRaw = BigInt(Math.floor(buyInNum * 1e6));
      const capitalRaw = BigInt(Math.floor(capital * 1e6));

      const result = await createGame(gameName, entryAmountRaw, capitalRaw, maxPlayers, startTime, endTime, worldIdProof);
      if (result?.data?.userOpHash) {
        haptic.success();
        setState('success');
        setTimeout(() => router.push('/my-games'), 1500);
      } else {
        throw new Error('No userOpHash');
      }
    } catch (e) {
      console.error('Create game failed:', e);
      haptic.error();
      setState('idle');
    }
  };

  return (
    <>
      <Page.Header>
        <TopBar
          title="New Game"
          startAdornment={
            <button
              onClick={handleBack}
              className="flex h-10 w-10 items-center justify-center rounded-full active:scale-90 transition-transform"
              style={{ backgroundColor: '#24242e' }}
            >
              <NavArrowLeft width={20} height={20} style={{ color: '#9898aa' }} />
            </button>
          }
          endAdornment={
            <span className="text-sm font-semibold" style={{ color: '#9898aa' }}>
              {step + 1}/{totalSteps}
            </span>
          }
        />
      </Page.Header>

      <Page.Main>
        {state === 'idle' && (
          <>
            {/* Progress bar */}
            <div className="flex gap-1.5 mb-8">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className="h-1 flex-1 rounded-full transition-all duration-300"
                  style={{ backgroundColor: i <= step ? '#2470ff' : '#2e2e3a' }}
                />
              ))}
            </div>

            {/* Step 0: Name */}
            {step === 0 && (
              <div>
                <h2 className="text-2xl font-extrabold mb-1" style={{ color: '#ffffff' }}>
                  Game name
                </h2>
                <p className="text-sm mb-8" style={{ color: '#9898aa' }}>
                  Give your game a name
                </p>

                <div className="rounded-2xl px-5 py-4" style={{ backgroundColor: '#1c1c24' }}>
                  <input
                    data-trade-input
                    type="text"
                    value={gameName}
                    onChange={(e) => setGameName(e.target.value)}
                    className="w-full bg-transparent text-2xl font-extrabold outline-none"
                    style={{ color: '#ffffff' }}
                    placeholder="Speed Round"
                  />
                </div>
              </div>
            )}

            {/* Step 1: Buy-in */}
            {step === 1 && (
              <div>
                <h2 className="text-2xl font-extrabold mb-1" style={{ color: '#ffffff' }}>
                  Buy-in amount
                </h2>
                <p className="text-sm mb-8" style={{ color: '#9898aa' }}>
                  How much USDC to enter the game
                </p>

                <div className="rounded-2xl px-5 py-4 mb-6" style={{ backgroundColor: '#1c1c24' }}>
                  <div className="flex items-center gap-2">
                    <Image src="/usd-coin-usdc-logo.svg" alt="USDC" width={28} height={28} />
                    <input
                      data-trade-input
                      type="number"
                      inputMode="decimal"
                      value={buyIn}
                      onChange={(e) => setBuyIn(e.target.value)}
                      className="w-full bg-transparent text-3xl font-extrabold outline-none"
                      style={{ color: '#ffffff' }}
                    />
                    <span className="text-lg font-bold" style={{ color: '#9898aa' }}>USDC</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {BUYIN_PRESETS.map((v) => (
                    <button
                      key={v}
                      onClick={() => { setBuyIn(v.toString()); haptic.selection(); }}
                      className="rounded-2xl text-base font-bold active:scale-95 transition-all"
                      style={{
                        height: '52px',
                        backgroundColor: buyInNum === v ? '#2470ff' : '#24242e',
                        color: buyInNum === v ? '#ffffff' : '#6a6a7a',
                      }}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Players */}
            {step === 2 && (
              <div>
                <h2 className="text-2xl font-extrabold mb-1" style={{ color: '#ffffff' }}>
                  Max players
                </h2>
                <p className="text-sm mb-8" style={{ color: '#9898aa' }}>
                  Between 2 and 100 players
                </p>

                <div className="flex flex-col items-center mb-10">
                  <span className="text-5xl font-extrabold" style={{ color: '#ffffff' }}>{maxPlayers}</span>
                  <span className="text-sm mt-1" style={{ color: '#9898aa' }}>players</span>
                </div>

                <div className="px-2 mb-6">
                  <input
                    type="range"
                    min={2}
                    max={100}
                    value={maxPlayers}
                    onChange={(e) => setMaxPlayers(Number(e.target.value))}
                    className="w-full"
                    style={{
                      height: '8px',
                      borderRadius: '4px',
                      appearance: 'none',
                      background: `linear-gradient(to right, #2470ff ${((maxPlayers - 2) / 98) * 100}%, #2e2e3a ${((maxPlayers - 2) / 98) * 100}%)`,
                    }}
                  />
                  <div className="flex justify-between mt-2 text-xs" style={{ color: '#9898aa' }}>
                    <span>2</span>
                    <span>100</span>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Capital */}
            {step === 3 && (
              <div>
                <h2 className="text-2xl font-extrabold mb-1" style={{ color: '#ffffff' }}>
                  Starting capital
                </h2>
                <p className="text-sm mb-8" style={{ color: '#9898aa' }}>
                  Virtual trading balance ($100 — $1M)
                </p>

                <div className="rounded-2xl px-5 py-4 mb-6" style={{ backgroundColor: '#1c1c24' }}>
                  <div className="flex items-center gap-1">
                    <span className="text-3xl font-extrabold" style={{ color: '#ffffff' }}>$</span>
                    <input
                      data-trade-input
                      type="number"
                      inputMode="decimal"
                      value={customCapital || startingCapital}
                      onChange={(e) => {
                        setCustomCapital(e.target.value);
                        setStartingCapital(0);
                      }}
                      className="w-full bg-transparent text-3xl font-extrabold outline-none"
                      style={{ color: '#ffffff' }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {CAPITAL_PRESETS.map((v) => (
                    <button
                      key={v}
                      onClick={() => {
                        setStartingCapital(v);
                        setCustomCapital('');
                        haptic.selection();
                      }}
                      className="rounded-2xl text-[14px] font-bold active:scale-95 transition-all"
                      style={{
                        height: '48px',
                        backgroundColor: startingCapital === v && !customCapital ? '#2470ff' : '#24242e',
                        color: startingCapital === v && !customCapital ? '#ffffff' : '#6a6a7a',
                      }}
                    >
                      {formatCapital(v)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 4: Start time */}
            {step === 4 && (() => {
              const days = Math.floor(startDelay / 1440);
              const hours = Math.floor((startDelay % 1440) / 60);
              const mins = startDelay % 60;
              const pad = (n: number) => n.toString().padStart(2, '0');
              const setFromParts = (d: number, h: number, m: number) => {
                setStartDelay(d * 1440 + h * 60 + m);
              };

              return (
                <div>
                  <h2 className="text-2xl font-extrabold" style={{ color: '#ffffff' }}>
                    Start time
                  </h2>
                  <div style={{ height: '24px' }} />
                  <p className="text-base text-center font-bold" style={{ color: '#9898aa' }}>{formatStartTime(startDelay)}</p>
                  <div style={{ height: '24px' }} />

                  <div className="flex gap-3 mb-6">
                    {[
                      { label: 'days', value: days, max: 30, set: (v: number) => setFromParts(v, hours, mins) },
                      { label: 'hrs', value: hours, max: 23, set: (v: number) => setFromParts(days, v, mins) },
                      { label: 'min', value: mins, max: 59, set: (v: number) => setFromParts(days, hours, v) },
                    ].map((f) => (
                      <div key={f.label} className="flex-1">
                        <div className="rounded-2xl py-4 text-center" style={{ backgroundColor: '#1c1c24' }}>
                          <input
                            data-trade-input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            max={f.max}
                            value={pad(f.value)}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => { f.set(Math.min(f.max, Math.max(0, Number(e.target.value) || 0))); }}
                            className="w-full bg-transparent text-center text-3xl font-extrabold outline-none"
                            style={{ color: '#ffffff' }}
                          />
                        </div>
                        <div className="text-center text-xs mt-2 font-semibold" style={{ color: '#6a6a7a' }}>{f.label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {START_PRESETS.map((preset) => (
                      <button
                        key={preset.minutes}
                        onClick={() => { setStartDelay(preset.minutes); haptic.selection(); }}
                        className="rounded-2xl text-[13px] font-bold active:scale-95 transition-all"
                        style={{
                          height: '44px',
                          backgroundColor: startDelay === preset.minutes ? '#2470ff' : '#24242e',
                          color: startDelay === preset.minutes ? '#ffffff' : '#6a6a7a',
                        }}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  {startDelay < 5 && (
                    <div className="rounded-2xl px-4 py-3 mt-4" style={{ backgroundColor: '#ff6b6b15', border: '1px solid #ff6b6b30' }}>
                      <span className="text-[13px]" style={{ color: '#ff6b6b' }}>Minimum 5 minutes</span>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Step 5: Duration */}
            {step === 5 && (() => {
              const days = Math.floor(duration / 1440);
              const hours = Math.floor((duration % 1440) / 60);
              const mins = duration % 60;
              const pad = (n: number) => n.toString().padStart(2, '0');
              const setFromParts = (d: number, h: number, m: number) => {
                setDuration(Math.max(1, d * 1440 + h * 60 + m));
              };

              return (
                <div>
                  <h2 className="text-2xl font-extrabold mb-8" style={{ color: '#ffffff' }}>
                    Duration
                  </h2>

                  <div className="flex gap-3 mb-6">
                    {[
                      { label: 'days', value: days, max: 30, set: (v: number) => setFromParts(v, hours, mins) },
                      { label: 'hrs', value: hours, max: 23, set: (v: number) => setFromParts(days, v, mins) },
                      { label: 'min', value: mins, max: 59, set: (v: number) => setFromParts(days, hours, v) },
                    ].map((f) => (
                      <div key={f.label} className="flex-1">
                        <div className="rounded-2xl py-4 text-center" style={{ backgroundColor: '#1c1c24' }}>
                          <input
                            data-trade-input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            max={f.max}
                            value={pad(f.value)}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => { f.set(Math.min(f.max, Math.max(0, Number(e.target.value) || 0))); }}
                            className="w-full bg-transparent text-center text-3xl font-extrabold outline-none"
                            style={{ color: '#ffffff' }}
                          />
                        </div>
                        <div className="text-center text-xs mt-2 font-semibold" style={{ color: '#6a6a7a' }}>{f.label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {DURATION_PRESETS.map((preset) => (
                      <button
                        key={preset.minutes}
                        onClick={() => { setDuration(preset.minutes); haptic.selection(); }}
                        className="rounded-2xl text-[13px] font-bold active:scale-95 transition-all"
                        style={{
                          height: '44px',
                          backgroundColor: duration === preset.minutes ? '#2470ff' : '#24242e',
                          color: duration === preset.minutes ? '#ffffff' : '#6a6a7a',
                        }}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Next / Create button */}
            <div className="mt-10">
              <button
                onClick={handleNext}
                disabled={!canNext}
                className="w-full rounded-2xl text-[17px] font-bold active:scale-[0.97] transition-all disabled:opacity-30"
                style={{ height: '60px', backgroundColor: '#2470ff', color: '#ffffff' }}
              >
                {step < totalSteps - 1 ? 'Next' : 'Create Game'}
              </button>
            </div>
          </>
        )}

        {state === 'pending' && <LoadingSpinner label="Creating game..." />}
        {state === 'success' && <SuccessState title="Game created" subtitle="Share it with your friends" />}
      </Page.Main>
    </>
  );
}
