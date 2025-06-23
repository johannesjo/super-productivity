import { Component, createSignal } from 'solid-js';
import './App.css';

interface ProcrastinationInfoProps {
  onBack: () => void;
  onBackToWork: () => void;
}

export const ProcrastinationInfo: Component<ProcrastinationInfoProps> = (props) => {
  const [activeTab, setActiveTab] = createSignal(0);

  return (
    <div class="page-fade">
      <div class="intro">
        <h2>Cut yourself some slack!</h2>
        <p>
          First of all: Relax! Everybody does procrastinate once in a while. And if you're
          not doing what you should, you should at least enjoy it!
        </p>
        <p>
          <strong>
            Remember: Procrastination is an emotion regulation problem, not a time
            management problem.
          </strong>{' '}
          This means beating yourself up is not the solution, it is part of the problem.
          Let that sink in and then check the other tabs here for some further help.
        </p>
      </div>

      <div class="tabs">
        <div class="tab-buttons">
          <button
            class={`tab-button ${activeTab() === 0 ? 'active' : ''}`}
            onClick={() => setActiveTab(0)}
          >
            Intro
          </button>
          <button
            class={`tab-button ${activeTab() === 1 ? 'active' : ''}`}
            onClick={() => setActiveTab(1)}
          >
            Curiosity
          </button>
          <button
            class={`tab-button ${activeTab() === 2 ? 'active' : ''}`}
            onClick={() => setActiveTab(2)}
          >
            Self Compassion
          </button>
          <button
            class={`tab-button ${activeTab() === 3 ? 'active' : ''}`}
            onClick={() => setActiveTab(3)}
          >
            Reframing
          </button>
        </div>

        <div class="tab-content">
          {activeTab() === 0 && (
            <section class="tab-inner">
              <p>
                First of all: Relax! Everybody does procrastinate once in a while. And if
                you're not doing what you should, you should at least enjoy it!
              </p>
              <p innerHTML="Remember: <b>Procrastination is an emotion regulation problem, not a time management problem.</b> This means beating yourself up is not the solution, it is part of the problem. Let that sink in and then check the other tabs here for some further help."></p>
              <div class="procrastination-graph">
                <div class="wrap">
                  <div class="graph-item">Fear of failure</div>
                  <div class="graph-item">Avoiding the task</div>
                </div>
                <div class="sync-icon">⟲</div>
                <div class="graph-item">Stressed about not getting things done</div>
              </div>
            </section>
          )}

          {activeTab() === 1 && (
            <section class="tab-inner">
              <p>
                Isn't procrastination interesting? It doesn't seem to make any sense to do
                it, since it is not in your long term interest at all. But still everybody
                does. It helps a lot explore und gain a better understanding on how it
                works for you personally! Some basic questions to ask yourself could be:
              </p>
              <ul>
                <li>What feelings are eliciting your temptation to procrastinate?</li>
                <li>Where do you feel them in your body?</li>
                <li>What do they remind you of?</li>
                <li>
                  What happens to the thought of procrastinating as you observe it? Does
                  it intensify? Dissipate? Cause other emotions to arise?
                </li>
                <li>
                  How are the sensations in your body shifting as you continue to rest
                  your awareness on them?
                </li>
              </ul>
              <h3>Writing down your procrastination triggers</h3>
              <p>
                Another very effective method is to record, what triggered your urge to
                procrastinate. For example I personally often have the urge to quickly
                jump to reddit or my favorite news site whenever my browser window comes
                into focus. Since I started writing down my triggers in a simple empty
                text document, I became aware of how ingrained this pattern was and it
                helped me to experiment with different counter measures.
              </p>
            </section>
          )}

          {activeTab() === 2 && (
            <section class="tab-inner">
              <p>
                People with high procrastination levels usually have low self-compassion.
                So practice it! It improves your feeling of self-worth, fosters positive
                emotions and can help you overcome procrastination, of course. Try a
                little exercise:
              </p>
              <ul>
                <li>
                  Sit down for bit and stretch yourself, if you like, calm down a little
                  bit
                </li>
                <li>Try to listen to the thoughts and feelings that arise</li>
                <li>
                  Are you responding to yourself in a way that you would respond to a
                  friend?
                </li>
                <li>
                  If the answer is no, imagine your friend in your situation. What you
                  would say to them? What you would do for them?
                </li>
              </ul>
              <p innerHTML='More exercises <a target="_blank" href="https://drsoph.com/blog/2018/9/17/3-exercises-in-self-compassion" target="_blank">can be found here</a> or on <a target="_blank" href="https://www.google.com/search?q=self+compassion+exercises&oq=self+compassion+excers&aqs=chrome.1.69i57j0l5.4303j0j7&sourceid=chrome&ie=UTF-8" target="_blank">google</a>.'></p>
            </section>
          )}

          {activeTab() === 3 && (
            <section class="tab-inner">
              <p>Think about what might be positive about the task despite its flaws.</p>
              <div class="reframe-questions">
                <div class="question-group">
                  <label>What might be interesting about it?</label>
                  <textarea></textarea>
                </div>
                <div class="question-group">
                  <label>What is to gain if you complete it?</label>
                  <textarea></textarea>
                </div>
                <div class="question-group">
                  <label>How will you feel about it if you complete it?</label>
                  <textarea></textarea>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>

      <div class="action-buttons">
        <button
          class="primary-button"
          onClick={props.onBackToWork}
        >
          Back to work!
        </button>
      </div>
    </div>
  );
};
