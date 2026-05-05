import { useGameStore } from "@/lib/store";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const GAME_MODES = [
  { id: 'Classic',        desc: 'Hit a fixed target using all your digits' },
  { id: 'Freestyle',      desc: 'Hit any target — use as few digits as you like' },
  { id: 'Random Numbers', desc: 'No solvability guarantee — pure improvisation' },
];

export default function Home() {
  const [_, setLocation] = useLocation();
  const { settings, updateSettings, highScore } = useGameStore();

  const handlePlay = () => setLocation("/game");

  const toggleMode = (mode: string) => {
    if (mode === 'Classic') {
      // Clicking Classic always switches to Classic-only
      updateSettings({ modes: ['Classic'] });
    } else {
      // If Classic is active, switch to the clicked mode (deselect Classic)
      // Otherwise toggle the mode in/out of the active set
      const current = settings.modes.includes('Classic') ? [] : settings.modes;
      const already = current.includes(mode);
      const modes = already
        ? current.filter(m => m !== mode)
        : [...current, mode];
      updateSettings({ modes: modes.length === 0 ? ['Classic'] : modes });
    }
  };

  const isClassic = settings.modes.includes('Classic');

  return (
    <div className="min-h-screen bg-black text-white p-6 flex flex-col items-center justify-center font-mono">
      <div className="w-full max-w-xl space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-6xl font-bold tracking-tighter text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]">
            NUMERICA
          </h1>
          <p className="text-gray-400">High Score: <span className="text-cyan-400">{highScore}</span></p>
        </div>

        <Card className="bg-gray-900 border-cyan-900 border-2 p-6 space-y-6 text-white shadow-[0_0_30px_rgba(34,211,238,0.1)]">

          {/* Digit Count */}
          <div className="space-y-3">
            <Label className="text-cyan-400 font-bold uppercase tracking-widest text-sm">Digit Count</Label>
            <RadioGroup
              defaultValue={settings.digitCount.toString()}
              onValueChange={(v) => updateSettings({ digitCount: parseInt(v) })}
              className="flex gap-4"
            >
              {[3, 4, 5, 6].map((n) => (
                <div key={n} className="flex items-center space-x-2 bg-gray-800 p-2 rounded border border-gray-700 hover:border-cyan-500 transition-colors">
                  <RadioGroupItem value={n.toString()} id={`d-${n}`} />
                  <Label htmlFor={`d-${n}`} className="cursor-pointer">{n}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Time Mode */}
          <div className="space-y-3">
            <Label className="text-cyan-400 font-bold uppercase tracking-widest text-sm">Time Mode</Label>
            <RadioGroup
              defaultValue={settings.timeMode}
              onValueChange={(v) => updateSettings({ timeMode: v })}
              className="grid grid-cols-2 gap-4"
            >
              {['60s', '2 min', '3 min', "Play 'til Dead"].map((t) => (
                <div key={t} className="flex items-center space-x-2 bg-gray-800 p-2 rounded border border-gray-700 hover:border-cyan-500 transition-colors">
                  <RadioGroupItem value={t} id={`t-${t}`} />
                  <Label htmlFor={`t-${t}`} className="cursor-pointer">{t}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Game Modes */}
          <div className="space-y-3">
            <Label className="text-cyan-400 font-bold uppercase tracking-widest text-sm">Game Modes</Label>
            <div className="space-y-2">
              {GAME_MODES.map(({ id, desc }) => {
                const checked = settings.modes.includes(id);
                return (
                  <div
                    key={id}
                    onClick={() => toggleMode(id)}
                    className={`flex items-start gap-3 p-3 rounded border transition-colors cursor-pointer
                      ${checked
                        ? 'bg-cyan-950 border-cyan-500'
                        : 'bg-gray-800 border-gray-700 hover:border-cyan-500'
                      }`}
                  >
                    <Checkbox
                      id={`m-${id}`}
                      checked={checked}
                      onCheckedChange={() => toggleMode(id)}
                      className="mt-0.5 shrink-0"
                    />
                    <div>
                      <Label htmlFor={`m-${id}`} className="font-bold cursor-pointer">{id}</Label>
                      <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Custom Target — Classic only */}
          {isClassic && (
            <div className="space-y-3">
              <Label className="text-cyan-400 font-bold uppercase tracking-widest text-sm">
                Target Number <span className="text-gray-500 font-normal normal-case tracking-normal text-xs">(10 – 50)</span>
              </Label>
              <Input
                type="number"
                value={settings.customTarget}
                onChange={(e) => {
                  const v = parseInt(e.target.value) || 24;
                  updateSettings({ customTarget: Math.min(50, Math.max(10, v)) });
                }}
                className="bg-gray-800 border-gray-700 text-white"
                min={10}
                max={50}
              />
            </div>
          )}

          <Button
            onClick={handlePlay}
            className="w-full h-16 text-2xl font-bold uppercase tracking-wider bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_20px_rgba(34,211,238,0.4)] hover:shadow-[0_0_30px_rgba(34,211,238,0.6)] transition-all"
          >
            Play Now
          </Button>

          <div className="text-center pt-2">
            <Link href="/leaderboard" className="text-gray-400 hover:text-cyan-400 transition-colors underline-offset-4 hover:underline">
              View Leaderboards
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
