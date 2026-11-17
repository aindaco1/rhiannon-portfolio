// Explicitly invoked fixture generator. Never runs during build or deployment.
import { writeFile, mkdir } from "node:fs/promises";
const photos = [
  [
    "red-study",
    7391141,
    "A portrait with theatrical makeup against a red background",
    "Polina Tankilevitch",
  ],
  [
    "still-life",
    35005061,
    "Red apples and sculptural folds of fabric",
    "Valentin Ivantsov",
  ],
  [
    "waiting-room",
    3589891,
    "A vintage room with armchairs and a dark teal wall",
    "Pexels contributor",
  ],
  [
    "rose-study",
    28956618,
    "An expressive makeup portrait with a rose",
    "Pexels contributor",
  ],
  [
    "red-veil",
    9919901,
    "A figure wrapped in translucent red fabric",
    "Vladimir Gladkov",
  ],
  [
    "empty-room",
    8222953,
    "An empty room with textured walls and soft light",
    "Pexels contributor",
  ],
  [
    "television",
    746742,
    "A wooden chair and a vintage television in a dark room",
    "Lê Minh",
  ],
  [
    "face-study",
    18201759,
    "A portrait with red makeup and draped fabric",
    "Amin Zand Miralvand",
  ],
];
await mkdir("assets/media", { recursive: true });
await Promise.all(
  photos.map(async ([name, id]) => {
    const res = await fetch(
      `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1600`,
    );
    if (!res.ok) throw new Error(`Photo ${id}: ${res.status}`);
    await writeFile(
      `assets/media/sample-${name}.jpg`,
      Buffer.from(await res.arrayBuffer()),
    );
  }),
);
const concepts = [
  [
    "Red study",
    ["makeup", "art"],
    0,
    "Color, texture, and a character taking shape.",
  ],
  [
    "Objects for a scene",
    ["props", "art"],
    1,
    "A small collection of objects with a life of their own.",
  ],
  [
    "The waiting room",
    ["sets", "film"],
    2,
    "An imagined interior, suspended between arrivals.",
  ],
  [
    "A face in bloom",
    ["makeup"],
    3,
    "A character study built around a single gesture.",
  ],
  [
    "Soft armor",
    ["art", "props"],
    4,
    "Fabric, silhouette, and the space around a body.",
  ],
  [
    "After the light",
    ["film", "sets"],
    5,
    "A quiet scene about what remains in a room.",
  ],
  [
    "Signal / noise",
    ["props", "film"],
    6,
    "Familiar objects, a slightly unfamiliar world.",
  ],
  [
    "Second skin",
    ["makeup"],
    7,
    "A study of shape, expression, and transformation.",
  ],
  [
    "Still, for a moment",
    ["art"],
    1,
    "A material study in red, shadow, and balance.",
  ],
  [
    "Room tone",
    ["sets"],
    2,
    "Building a place that feels as if someone just left.",
  ],
  [
    "The red thread",
    ["film"],
    4,
    "An imagined short film told through color and movement.",
  ],
  [
    "A trace of color",
    ["makeup", "art"],
    0,
    "Small marks that change the whole picture.",
  ],
  [
    "The borrowed room",
    ["sets"],
    5,
    "An interior assembled from light and texture.",
  ],
  [
    "Ordinary magic",
    ["props"],
    6,
    "Everyday objects considered as characters.",
  ],
  [
    "Night flowers",
    ["makeup", "film"],
    3,
    "A mood study for a character after dark.",
  ],
  [
    "Tender objects",
    ["art", "props"],
    1,
    "Soft forms and objects held in careful balance.",
  ],
  [
    "Between scenes",
    ["film"],
    2,
    "A fragment of a story, before anything happens.",
  ],
  [
    "False front",
    ["sets", "props"],
    6,
    "Building the details that make a fictional place believable.",
  ],
  [
    "Veil studies",
    ["art"],
    4,
    "A series of experiments with color and concealment.",
  ],
  ["Last look", ["makeup", "film"], 7, "A final character and lighting study."],
];
const categories = ["Art", "Makeup", "Props", "Sets", "Film"].map((label) => ({
  id: label.toLowerCase(),
  slug: label.toLowerCase(),
  label,
}));
const tags = [
  "Character study",
  "Texture",
  "Color",
  "Short film",
  "Objects",
  "Interiors",
].map((label) => ({
  id: label.toLowerCase().replaceAll(" ", "-"),
  slug: label.toLowerCase().replaceAll(" ", "-"),
  label,
}));
const image = (n) => ({
  src: `/assets/media/sample-${photos[n][0]}.jpg`,
  alt: photos[n][2],
  caption: `Placeholder photograph: ${photos[n][3]} / Pexels.`,
  decorative: false,
});
const data = {
  schemaVersion: 1,
  demo: true,
  profile: {
    name: "R. Barela",
    intro: "An artist, makeup, prop and set designer for film, and filmmaker.",
    bio: "Working across art, makeup, props, sets, and filmmaking.\n\nThis preview brings those disciplines together in one place. The projects and photographs shown here are placeholders; a full biography, selected credits, and original work will follow.",
    email: "",
    instagram: "https://www.instagram.com/r._barela/",
    imdb: "https://www.imdb.com/name/nm15080135/",
    url: "",
    portrait: "",
  },
  categories,
  tags,
  entries: concepts.map(([title, cats, n, intro], i) => ({
    id: `sample-${i + 1}`,
    slug: title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/-$/, ""),
    kind: "project",
    status: "published",
    sample: true,
    title,
    intro,
    year: 2026 - Math.floor(i / 7),
    date: "2026-11-17",
    role: cats
      .map((id) => categories.find((c) => c.id === id).label)
      .join(" / "),
    categories: cats,
    tags: [tags[i % tags.length].id, tags[(i + 2) % tags.length].id],
    cover: image(n),
    credits:
      "Fictional project for layout review. These stock photographs are not work by R. Barela. Replace the project, imagery, role and credits with approved material before launch.",
    blocks: [
      {
        type: "text",
        align: "left",
        body: `## The idea\n\n${intro} This fictional project demonstrates how a finished piece can sit alongside the thinking and materials behind it.\n\nA real project can tell its own story here: the brief, the process, and the details that made it work.`,
      },
      {
        type: "gallery",
        align: "left",
        layout: "grid",
        caption_style: "inline",
        images: [image(n), image((n + 1) % photos.length)],
        caption: "Reference imagery for the sample portfolio.",
      },
      {
        type: "text",
        align: "left",
        body: "## Behind the work\n\nUse this space for sketches, a few words about the process, or a moment from the set. Keep the images close to the story they tell.",
      },
      ...(i === 5
        ? [
            {
              type: "video",
              provider: "vimeo",
              video_id: "76979871",
              src: "",
              poster: image(n).src,
              caption:
                "Vimeo sample player — placeholder video, not R. Barela’s film.",
              align: "left",
            },
          ]
        : []),
    ],
  })),
};
await writeFile("content/catalog.json", JSON.stringify(data, null, 2) + "\n");
await writeFile(
  "docs/IMAGE-SOURCES.md",
  "# Placeholder photographs\n\nAll are stock reference imagery, not R. Barela’s work. Remove or replace before launch. Downloaded from Pexels; no photographs from the design references were reused.\n\n" +
    photos
      .map(
        ([name, id, alt, author]) =>
          `- sample-${name}.jpg: [${author} — ${alt}](https://www.pexels.com/photo/${id}/)`,
      )
      .join("\n") +
    "\n\nLicense: https://www.pexels.com/license/\n",
);
console.log(
  `Created ${data.entries.length} sample projects and ${photos.length} image sources.`,
);
