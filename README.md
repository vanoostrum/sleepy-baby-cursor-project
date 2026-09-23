# Todler sleep monitor
## *SleepyBaby*

Small kids need a lot of sleep. It is important for their development. For parents it is always a strugle to make sure their kid has enough sleep, goes to bed on time and has their afternoon naptime.

I want to build an App that can keep track of a kids sleep time. How many hours per day do they sleep? What is the average over a week or a month? Are their hours of sleep in line with what is recommended for a kid their age?

### Features

- Add a kid (profile with name, gender, birthday, avatar / icon)
- A button to start sleep time. Recording nap time during the day or sleep time during the night.
- A button to stop sleep time.
- An overview of night sleep time, nap time and total sleep time per day
- A way to remove or correct sleep time records per day
- An histogram with average per week / month, also showing their recommended sleep time, where you can easily see if they sleep enough, too little or too much

If you can think of any other cool, interesting or useful features feel free to add them as long as they are not too big.

### UX/UI:

Make the UX intuitive, with as little distractions on screen as possible. Make the UI look slick and playfull. Add some slide or bouncy animations if you think they fit certain elements.

### Technical specs:

- Repository: https://github.com/vanoostrum/sleepy-baby-cursor-project
- React Native Expo (CNG)
- Unistyles
- Data on local storage

### Project Harness:

- Unit tests with jest
- Integration tests with detox
- Lint rules
- Prettier rules
- strict tsc
- CI


## Steps:

1. Create the project setup
2. Create the project Harness
3. Create GitHub Actions for CI
4. Create the Cursor Cloud environment if needed
5. Divide the feature work into smaller parts
6. Implement the project


## Agent Test scenarios

One repo per project. All PRs are automatically merged. No human interference.

### Basic

A single agent prompt

### Implementation Orchestrator

Feed the prompt to an orchestrator that delegates tasks to other agents

### Impl, review and test Orchestrator

Let the orchestrator also delegate to review and testing agents. The harness includes a verification skill

### Grokbot project manager with notion tickets

Let grokbot create a project plan with tickets and delegate the work to engineering bots that delegate to agents. The engineering bots are responsible for the review and test iterations.

### Variants

All options can have the following variants:

- Harness
 - Explicitely no harness.
 - Agent defined basic harness
 - Agent defined strict harness
 - Predefined basic harness
 - Predefined strict harness
- Skills
 - pstack
 - bstack (budget pstack)
 - create / run ticket
 - none
- With or without verification skill

