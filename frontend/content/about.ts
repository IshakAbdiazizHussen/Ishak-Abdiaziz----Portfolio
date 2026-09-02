/**
 * How I Got Here — a short, human background. NOT a resume.
 *
 * This is a fill-in template. Replace every bracketed line with your own words
 * before launch. Aim for ~250–350 words total, first person, plain voice, with
 * a clear arc: where it started → the turn toward AI/ML → where you are now.
 */
export const about = {
  header: {
    kicker: "How I got here",
    titleLines: ["I came in through the software side,", "and stayed for the failure cases"],
  },
  intro: "The short version of how I ended up building AI systems for a living.",
  paragraphs: [
    "I started by building things people had to use — small web applications where a " +
      "broken form meant someone could not finish their work. That taught me the part of " +
      "engineering that has nothing to do with models: reading logs at an unreasonable " +
      "hour, writing the boring migration properly, and accepting that a feature is not " +
      "finished when it works on your machine.",
    "Machine learning arrived as a tool for a problem I already had, not as a subject I " +
      "studied in the abstract. The first model I trained was worse than the heuristic it " +
      "was supposed to replace. Working out why — bad labels, a leak between train and " +
      "test, a metric that flattered the majority class — was more instructive than any " +
      "tutorial, and it set the habit I still work by: build the evaluation before the " +
      "model, and be suspicious of a number that looks good on the first try.",
    "Since then I have deliberately stayed on both sides. I write the training loop and I " +
      "write the endpoint that serves it, because the interesting problems live in " +
      "between — how a confidence score should be shown to someone who has never heard of " +
      "softmax, what an agent should do when its sources disagree, how much latency a " +
      "user will accept before the accuracy stops mattering. Those questions do not get " +
      "answered in a notebook.",
    "What I look for now is work where correctness is checkable and the stakes of being " +
      "wrong are real enough that someone cares about the difference between 78% and 91%.",
  ],
} as const;
