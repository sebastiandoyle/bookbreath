export const INTENTION_PROMPTS = [
  "What's on your mind right now?",
  "What would you like to let go of today?",
  "Set an intention for this session...",
  "How is your body feeling?",
  "What are you working toward lately?",
];

export function getIntroPrompt(
  userIntention: string,
  bookTitle: string,
  bookAuthor: string,
  chapterPreview: string
): string {
  return `You are a calm, warm meditation guide. Generate a personalized body scan and deep breathing intro for a focused attention meditation session.

The listener's intention: "${userIntention}"
They are about to listen to "${bookTitle}" by ${bookAuthor}.

Here is a preview of the chapter they'll hear:
"""
${chapterPreview}
"""

Write a script that:
- Begins with a gentle greeting acknowledging their intention
- Guides them through 3-4 slow, deep breaths (write these out naturally, e.g. "Breathe in slowly... and let it go")
- Leads a brief body scan (head to toes, ~1 minute of spoken text)
- Weaves in 1-2 themes from the chapter preview — suggest a listening intention based on what's coming
- Transitions them into focused listening mode, framing their mindset for the chapter's content
- Reminds them to gently notice when their mind wanders and return their attention to the words

Keep the tone warm, unhurried, and grounded. About 300-400 words (roughly 2-3 minutes when spoken). Write only the spoken script — no stage directions or annotations.`;
}

export function getNudgesPrompt(
  userIntention: string,
  passages: string[],
  bookTitle: string,
  bookAuthor: string
): string {
  return `You are a calm meditation guide helping someone practice focused attention while listening to "${bookTitle}" by ${bookAuthor}. The listener's intention for this session is: "${userIntention}"

Generate ${passages.length - 1} brief attention nudges — one for each break between book passages. Each nudge should:
- Be 2-3 sentences long
- Reference specific themes or ideas from the passage just heard and/or the passage coming next
- Sometimes reference the listener's intention ("${userIntention}")
- Vary in approach: some focus on breath, some on body, some on the intention, some on simply returning attention
- Always end by guiding attention back to listening
- NOT be generic — tie each nudge to the actual content

Return the nudges as a JSON array of strings. Example format:
["nudge 1 text", "nudge 2 text", ...]

Here is the context for each passage (use this to make nudges specific):
${passages.map((p, i) => `Passage ${i + 1}: "${p.slice(0, 600)}"`).join("\n\n")}

Return ONLY the JSON array, no other text.`;
}

export function getPacingPrompt(text: string, segmentType: string): string {
  const pauseGuidelines: Record<string, string> = {
    intro: `- After breathing cues ("breathe in", "let it go", "exhale"): 8 seconds
- After body scan transitions ("now move your attention to..."): 6 seconds
- After regular sentences: 1 second
- After the final line: 3 seconds`,
    nudge: `- Insert exactly ONE long reflective pause of 20 seconds somewhere near the middle of the nudge (pick the most natural moment for the listener to sit with their thoughts)
- Between other sentences: 2-3 seconds
- After the final line: 3 seconds`,
    passage: `- Between natural paragraph or topic breaks: 3-4 seconds
- Between regular sentences within the same thought: 0 (let TTS flow naturally)
- After the final line: 1 second`,
    closing: `- Between each line: 6 seconds
- After the very last line: 7 seconds`,
  };

  const guidelines = pauseGuidelines[segmentType] || pauseGuidelines.passage;

  return `You are a meditation session editor. Your job is to take a spoken meditation script and split it into individual spoken lines with pause annotations.

RULES:
1. Do NOT change, add, or remove any words. Only split the text into lines and add pause durations.
2. Split at natural sentence boundaries. A "line" can be one or two sentences that form a single thought.
3. Annotate each line with how many seconds of silence should follow it.

PAUSE GUIDELINES for "${segmentType}" segments:
${guidelines}

INPUT TEXT:
"""
${text}
"""

Return a JSON array of objects. Each object has "line" (the spoken text) and "pause_after_seconds" (number).
Example: [{"line": "Take a deep breath in.", "pause_after_seconds": 5}, {"line": "Now slowly exhale.", "pause_after_seconds": 4}]

Return ONLY the JSON array, no other text.`;
}
