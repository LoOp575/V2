export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-2">
      <h1 className="text-accent-amber text-sm uppercase tracking-[0.3em]">404</h1>
      <p className="text-text-mid text-[12px]">route not found</p>
      <a href="/" className="text-accent-cyan text-[11px] uppercase tracking-widest underline">
        return to terminal
      </a>
    </div>
  );
}
