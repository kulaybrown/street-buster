export default function StartScreen({ onStart }) {
  return (
    <section className="screen screen-start is-active" id="screen-start" aria-label="Start screen">
      <div className="hero-card">
        <p className="section-label">Bonus Stage</p>
        <h2>Smash the target before time runs out.</h2>
        <p className="lead">Choose your fighter, pick the stage, then punch and kick your way through the bonus round.</p>
        <button className="start-button-text" id="start-button" type="button" onClick={onStart}>
          TAP TO START
        </button>
      </div>
    </section>
  );
}

