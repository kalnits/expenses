export function App() {
  return (
    <main className="app-shell">
      <section className="expense-panel" aria-labelledby="app-title">
        <header className="app-header">
          <p className="eyebrow">Личный учёт</p>
          <h1 id="app-title">Расходы в Таиланде</h1>
          <p className="intro">Все траты будут собраны здесь.</p>
        </header>
        <button className="add-expense-button" type="button">
          Добавить расход
        </button>
      </section>
    </main>
  )
}
