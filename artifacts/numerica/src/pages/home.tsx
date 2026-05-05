import { useGameStore } from "@/lib/store";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export default function Home() {
  const [_, setLocation] = useLocation();
  const { settings, updateSettings, highScore } = useGameStore();

  const handlePlay = () => {
    setLocation("/game");
  };

  const toggleMode = (mode: string) => {
    const modes = settings.modes.includes(mode)
      ? settings.modes.filter(m => m !== mode)
      : [...settings.modes, mode];
    if (modes.length === 0) modes.push("Classic");
    updateSettings({ modes });
  };

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

          <div className="space-y-3">
            <Label className="text-cyan-400 font-bold uppercase tracking-widest text-sm">Game Modes</Label>
            <div className="grid grid-cols-2 gap-4">
              {['Classic', 'Closest Wins', 'Balance the Equation', 'Random Numbers'].map((mode) => (
                <div key={mode} className="flex items-center space-x-2 bg-gray-800 p-2 rounded border border-gray-700 hover:border-cyan-500 transition-colors">
                  <Checkbox 
                    id={`m-${mode}`} 
                    checked={settings.modes.includes(mode)}
                    onCheckedChange={() => toggleMode(mode)}
                  />
                  <Label htmlFor={`m-${mode}`} className="cursor-pointer">{mode}</Label>
                </div>
              ))}
            </div>
          </div>

          {settings.modes.includes('Classic') && (
            <div className="space-y-3">
              <Label className="text-cyan-400 font-bold uppercase tracking-widest text-sm">Custom Target (Classic)</Label>
              <Input 
                type="number" 
                value={settings.customTarget}
                onChange={(e) => updateSettings({ customTarget: parseInt(e.target.value) || 24 })}
                className="bg-gray-800 border-gray-700 text-white"
                min={10} max={99}
              />
            </div>
          )}

          <div className="space-y-3">
            <Label className="text-cyan-400 font-bold uppercase tracking-widest text-sm">Optional Rules</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2 bg-gray-800 p-2 rounded border border-gray-700 hover:border-cyan-500 transition-colors">
                <Checkbox
                  id="opt-neg"
                  checked={settings.allowNegative}
                  onCheckedChange={(v) => updateSettings({ allowNegative: !!v })}
                />
                <Label htmlFor="opt-neg" className="cursor-pointer">Negative Numbers</Label>
              </div>
              <div className="flex items-center space-x-2 bg-gray-800 p-2 rounded border border-gray-700 hover:border-cyan-500 transition-colors">
                <Checkbox
                  id="opt-frac"
                  checked={settings.allowFractions}
                  onCheckedChange={(v) => updateSettings({ allowFractions: !!v })}
                />
                <Label htmlFor="opt-frac" className="cursor-pointer">Fractions</Label>
              </div>
            </div>
          </div>

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