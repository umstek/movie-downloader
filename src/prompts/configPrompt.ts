import enquirer from "enquirer";

export async function configPrompt() {
  const { download, resolution } = await enquirer.prompt<{
    download: boolean;
    resolution: string;
  }>([
    {
      type: "select",
      name: "download",
      message: "Do you want movie downloader to attempt downloading files?",
      choices: [
        {
          name: "yes",
          message: "Yes, try to download them.",
          hint: "If download fails, show the links.",
          value: true,
        },
        {
          name: "no",
          message: "No, just display download links.",
          value: false,
        },
      ],
    },
    {
      type: "select",
      name: "resolution",
      message: "What resolution do you prefer?",
      choices: [
        {
          name: "Best",
          message: "Best available",
          value: "best",
          hint: "This may use a lot of data.",
        },
        {
          name: "4k",
          message: "4K (Ultra HD)",
          value: "4k",
          hint: "And fallback to 1080p, ...",
        },
        {
          name: "1080p",
          message: "1080p (Full HD)",
          value: "1080",
        },
        {
          name: "720p",
          message: "720p (HD)",
          value: "720",
        },
      ],
      result(value) {
        return value as string;
      },
    },
  ]);

  return { download, resolution };
}
