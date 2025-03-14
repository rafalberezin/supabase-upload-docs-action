# How I Use It

This is just a quick look into why I made this action and how I use it with my
other project. Let's get right to it.

## Why

I was making a personal website (which you probably read this on) that would
host **wikis/documentations** for my projects. I wanted to keep the
documentation along with the projects in their repos for convenience, but
downloading the files directly from there doesn't seem like a viable solution. I
was playing around with Supabase at the moment, so I decided to put the
documentation there.

But uploading files manually every time I change something is annoying, so I did
what software developers do, and instead of spending 3 minutes on it twice a
year, I spent significantly more time automating the process.

Since the files are inside the repositories on GitHub, I went with the obvious
solution of using GitHub Actions. I didn't find any solution that satisfied my
needs completely, so now here I am writing about why I made it myself.

And it's also a great opportunity to learn new things. Also, for that reason, I
decided to use **TS** instead of plain **JS**.

### In Short

- **Automate** the process of managing documentation
- **Learn** about:
  - **GitHub Actions** in greater detail, not just the workflows
  - **TypeScript** and **Testing**
  - **Supabase**
  - **Writing documentation**
  - **Managing open-source projects**
- And potentially help someone else save a little bit of time

## How: Action

So how do I use it? The default configuration mostly shows my use case.

First, I put all the files into a single descriptive directory called `docs`.
Then, I decided to further organize it by separating actual content
(`docs/articles`) from supporting files (`docs/assets`).

For consistency across my work, I decided to use **kebab-case**, so the action
automatically converts file names to that. Since I also need some nice-looking
titles for articles, I decided to generate them from slugs.

As I'm already using Supabase storage, I thought that I might as well store some
data about projects in the database.

Besides all the
[generated data](./02-core-concepts/02-metadata-management.md#generated-data), I
wanted to store more stuff that others might not really need or want. So for
that, I made the
[metadata file](./02-core-concepts/02-metadata-management.md#metadata-file) to
allow for custom data to be uploaded. And since I'm already here, I also allowed
to override the generated data.

Additional data I store includes:

| Name       | Type      | Description                                                                                                                                                |
| ---------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `color`    | `TEXT`    | Accent color for the project on my website. Most of the time it will be `var(--something)` to get a color from the website's color palette.                |
| `tags`     | `JSONB`   | Project tags. This is just an **object mapping tag names to colors**.                                                                                      |
| `featuerd` | `BOOLEAN` | If this project is featured. Up to 3 of those are displayed on the home page of my website. They also get a golden (yellow really) star next to the title. |

The [column mappings](./03-configuration.md#column-mappings) feature is just for
other people since the action is tailored for me.

I realize that others might not want the current behaviors, so I'm planning to
make everything fully configurable in the next major release. If you're
interested in that, then check out [v2 Roadmap](./08-v2-roadmap.md).

## How: Documentation

I needed to keep the documentation ordered, but I also wanted clean paths on my
website, so I added the [prefix trimming](./03-configuration.md#trim-prefixes).
But now there's another issue: the files are ordered in the repo, but how do I
know the order on my website? Well, now there's also
[article mapping](./02-core-concepts/03-article-mapping.md).

And there's more: I can easily navigate between the articles locally while
editing, get path suggestions, and reference the assets relatively. It should
also work on GitHub, so if someone needs to view the documentation at a specific
time of the project's development, they can do that too.

But there are more issues. If I use the prefixes in links across the articles,
they won't work with the files inside Supabase, so during markdown rendering my
website removes the prefixes. Another thing is that the assets are referenced
relatively, which also won't work, so the website also updates the paths to
point to files in the Supabase storage.

The action's purpose is simple: **upload the files**. And since I'm not
enforcing any restrictions on which file types can or cannot be used with the
action, it won't support these functionalities. I leave that to the people
maintaining the documentation and their frontend to decide how it all works.

And yes, I asked AI to write the docs. But in the end, it was way easier to
write it myself than to explain everything to it so it would write everything
properly and not hallucinate details. I asked it to find typos and suggest
improvements later though.

## And That's All

This started as a side project for **automation** and **learning**, but I hope
someone else finds it useful too.

Now that I think about it, why is automation so addicting? Maybe I should spend
a month playing Factorio to find out. 🤔

Anyway, **Thank you** for reading, and **have a nice day**!
