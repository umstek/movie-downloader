import prompts from "prompts";

export async function configPrompt() {
  const { download, resolution }: { download: boolean; resolution: string } =
    await prompts([
      {
        type: "select",
        name: "download",
        message: "Do you want movie downloader to attempt downloading files?",
        initial: 0,
        choices: [
          {
            title: "Yes, try to download them.",
            description: "If download fails, show the links.",
            value: true,
          },
          {
            title: "No, just display download links.",
            description: "I'll use my favorite download tool.",
            value: false,
          },
        ],
      },
      {
        type: (prev) => (prev ? "select" : null),
        name: "resolution",
        message: "What resolution do you prefer?",
        choices: [
          {
            title: "Best available",
            value: "best",
            description: "This may use a lot of data.",
          },
          {
            title: "4K (Ultra HD)",
            value: "4k",
            description: "And fallback to 1080p, ...",
          },
          {
            title: "1080p (Full HD)",
            value: "1080",
          },
          {
            title: "720p (HD)",
            value: "720",
          },
        ],
      },
    ]);

  return { download, resolution };
}
