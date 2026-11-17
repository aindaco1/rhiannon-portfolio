// Demonstration copy for visual review and tests; never attributed to the artist.
const base = {
  kind: "post",
  status: "published",
  sample: true,
  year: 2026,
  role: "",
  categories: [],
  tags: [],
  cover: { src: "", alt: "", caption: "", decorative: false },
  credits:
    "Demonstration copy written for this website preview. These are fictional sample pieces, not writing by R. Barela.",
};
export const sampleWriting = [
  {
    ...base,
    id: "sample-writing-room",
    slug: "a-room-before-the-scene",
    title: "A room before the scene",
    date: "2026-11-17",
    intro:
      "A sample essay on the objects, spaces, and small details that begin to suggest a story.",
    blocks: [
      {
        type: "text",
        align: "left",
        body: "Before anyone enters a room, it has already begun to tell a story. A chair turned slightly away from the table. A mark on the wall where a picture used to hang. Afternoon light finding the one clean patch of floor. None of these things explains what happened. Together, they make it possible to imagine.\n\nA space can carry a feeling without illustrating it. It can be carefully prepared and still seem accidental. The interesting part is often the distance between those two things: what has been made, and what appears simply to have been there.",
      },
      {
        type: "text",
        align: "left",
        body: "## The things left behind\n\nAn object changes when it belongs to a place. A cup on a shop shelf is one thing; the same cup, with a small crack in the handle, beside a bed is another. Its meaning arrives through its neighbors.\n\nThis is one way to think about building a fictional room. Start with what someone uses, keeps, moves, or forgets. Think about where a hand would reach before deciding what the camera should see. Let an arrangement carry the suggestion of a habit.\n\nNot every detail needs an explanation. Some things can remain ordinary. That ordinariness makes room for the one detail that feels slightly out of place.",
      },
      {
        type: "quote",
        align: "left",
        text: "A place becomes convincing when it leaves room for a life beyond the frame.",
        author: "",
      },
      {
        type: "text",
        align: "left",
        body: "## Leaving space\n\nThere is a temptation to fill every corner. More texture, another object, one more clue. But an empty area can do useful work. It gives the eye somewhere to rest and allows a small gesture to become visible.\n\nImagine the same room before and after a person crosses it. What stays where it was? What has moved only a little? A story might begin with that difference, rather than with anything that can be named in advance.\n\nThe room does not need to tell us everything. It only needs to make us want to look a little longer.",
      },
    ],
  },
  {
    ...base,
    id: "sample-writing-notebook",
    slug: "keeping-a-notebook",
    title: "Keeping a notebook",
    date: "2026-11-12",
    intro: "A short sample note about keeping an idea before it has a purpose.",
    blocks: [
      {
        type: "text",
        align: "left",
        body: "Some observations are too small to become a project, but too particular to lose. The color of a wall just after sunset. The shape of a shadow on a piece of folded cloth. A sentence overheard without its beginning.\n\nA notebook can hold these things without asking them to explain themselves. They do not need to be organized, useful, or even good. They only need to be recorded clearly enough that the feeling can be found again.",
      },
      {
        type: "text",
        align: "left",
        body: "## A few things to keep\n\n- A color described in words instead of a paint number.\n- An object drawn from memory, including the parts that are uncertain.\n- A question that does not yet have an answer.\n- A fragment of a scene with no story around it.\n\nReturning to these notes later can be a different kind of looking. The original moment has passed; something else may now be visible. An idea that once seemed isolated might sit comfortably beside another.\n\nThe page is a place to notice that connection, and then leave it open.",
      },
    ],
  },
];
