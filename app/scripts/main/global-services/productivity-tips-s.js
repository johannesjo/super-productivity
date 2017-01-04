/**
 * @ngdoc service
 * @name superProductivity.ProductivityTips
 * @description
 * # ProductivityTips
 * Service in the superProductivity.
 */

(function () {
  'use strict';

  angular
    .module('superProductivity')
    .service('ProductivityTips', ProductivityTips);

  /* @ngInject */
  function ProductivityTips() {

    // source: https://www.americanexpress.com/us/small-business/openforum/articles/productivity-tips-from-incredibly-busy-entrepreneurs/
    this.tips = [
      {
        title: 'Have a single purpose focus',
        content: 'One thing many successful entrepreneurs have in common is the ability to focus on what matters most. Eric Schmidt, Google\'s executive chairman, says, "I keep things focused. The speech I give every day is: \'This is what we do. Is what we are doing consistent with that, and can it change the world?\'" Jason Goldberg, CEO of Fab.com, has this piece of advice: "Pick one thing and do that one thing—and only that one thing—better than anyone else ever could." We can derive a great deal of power from developing a laser focus on our top business priorities. It\'s one of the attributes that sets apart the average businessperson from the more successful one.'
      },
      {
        title: 'Ruthlessly block out distractions',
        content: 'Tennis legend Martina Navratilova says, "I concentrate on concentrating." For those of us who don\'t have the willpower to be self-accountable, there are several technology solutions for blocking out distractions. For example, Rescue Time is an application that runs in the background of your computer and measures how you spend your time so you can make better decisions. Get Concentrating is another useful tool that will help you focus on important tasks by temporarily blocking social media sites. (Are you easily distracted? If so, here are six more popular programs to block distractions.)'
      },
      {
        title: 'Set a strict time limit on meetings',
        content: 'Carlos Ghosn, CEO of Renault and Nissan, is strict on the timing allotted for single-topic, non-operational meetings: He allows a maximum of one hour and 30 minutes. Fifty percent of the time is for the presentation, and 50 percent is for discussion. Gary E. McCulloughwww.inc.com, former U.S. army captain and now CEO of Career Education Corp., gives people half of the time they ask for a meeting or appointment. This forces them to be brief, clear and to the point. "By doing that, I am able to cram a number of things in the day and move people in and out more effectively and more efficiently," McCullough says. People generally don\'t need as much time as they ask for. Meetings are time vampires. Be ruthless in managing this endemic productivity drain so you can focus on high value tasks.'
      },
      {
        title: 'Set up productivity rituals.',
        content: 'Tony Schwartz, CEO of The Energy Project, provides four tips for setting up rituals to automate behaviors that will make us more productive, without depleting our energy reservoir. One of them is prioritizing one key task to accomplish per day, and starting your day focused on that task. "Force yourself to prioritize so that you know that you will finish at least that one critical task during the period of the day when you have the most energy and the fewest distractions," Schwartz says.'
      },
      {
        title: 'Get up earlier.',
        content: 'Research shows that mornings can make or break your day. It\'s not uncommon for successful CEOs to start their day well before 6 a.m. In 27 Executives Who Wake Up Really Early, we see how incredibly busy people—from Jeff Immelt, CEO of GE, to Indra Nooyi, CEO of PepsiCo—use their mornings to seize the day. Use the mantra "mind over mattress" to motivate yourself to get out of bed to pursue your goals. As Laura Vanderkam says in What Successful People Do Before Breakfast: A Short Guide To Making Over Your Morning—And Life, while many are sleeping in, successful people are already up and getting a lot done. If this is not your preference, Vanderkam advises to start with small steps, such as getting up just 15 minutes earlier every day and gradually increasing the time.'
      },
      {
        title: 'Group your interruptions.',
        content: 'This idea comes from restaurateur Danny Meyer. He has his assistant group all questions that come up during the day in one list so she doesn\'t have to interrupt him repeatedly during office hours. Take a cue from this and see how you can ask others on your team to group questions, requests and other non-urgent inquiries so you\'re not distracted by interruptions that don\'t add value.'
      },
      {
        title: 'Outsource personal chores.',
        content: 'Highly productive people are selective about how they expend their energy. They don\'t waste it on tasks that others can do. For example, Alexis Ohanian, founder of Reddit, uses services such as Fancy Hands, an army of virtual assistants. Others automate grocery shopping with sites such as Amazon\'s Subscribe and Save, or services that deliver groceries to your doorstep. Others even use services such as Plated, which delivers perfectly measured ingredients for chef designed meals at home. Do a cost/benefit analysis of how you spend your time and see if it\'s worth offloading some repetitive tasks so you can focus on what will bring value to your company.'
      },
      {
        title: 'Set up email rules to maintain sanity. ',
        content: 'Katia Beauchamp and Hayley Barna, founders of Birchbox, insist that team members indicate when they need a response in all emails. This simple tip helps with prioritization. Designer Mike Davidson has set up an email policy that limits any email he sends to five sentences. As he explains, many email messages in his inbox take more time for him to answer than they did for the sender to write. Analyze your email habits and institute time-saving policies that work for your particular situation.'
      },
      {
        title: 'Capture all creative ideas.',
        content: 'The world renowned scientist Dr. Linus Pauling once said, "The best way to have a good idea is to have a lot of ideas." Most leaders and entrepreneurs are visionaries who generally don\'t lack good ideas; however, capturing all these ideas is often a challenge for busy people. Evernote is a popular, free program for collecting ideas. (Here\'s a list of other tools to consider.)'
      }
    ];

    this.getRandom = () => {
      let randomTipIndex = Math.floor((Math.random() * this.tips.length));
      let randomTip = this.tips[randomTipIndex];
      randomTip.subTitle = 'Productivity Tip';
      return randomTip;
    };
  }

})();
