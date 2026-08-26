export const TILE_BACK_SOURCE_COLOR = "#FF0004";

export const replaceTileBackColor = (svg, color) =>
  svg.replace(/#FF0004/gi, color);

export const createColorizedTileImages = async (imageMap, color) => {
  if (color.toUpperCase() === TILE_BACK_SOURCE_COLOR) {
    return { images: imageMap, revoke: () => {} };
  }

  const objectUrls = [];

  try {
    const colorizedEntries = await Promise.all(
      Object.entries(imageMap).map(async ([tile, source]) => {
        const response = await fetch(source);

        if (!response.ok) {
          throw new Error(`Unable to load tile artwork for ${tile}`);
        }

        const svg = replaceTileBackColor(await response.text(), color);
        const objectUrl = URL.createObjectURL(
          new Blob([svg], { type: "image/svg+xml" })
        );
        objectUrls.push(objectUrl);
        return [tile, objectUrl];
      })
    );

    return {
      images: Object.fromEntries(colorizedEntries),
      revoke: () => objectUrls.forEach((url) => URL.revokeObjectURL(url)),
    };
  } catch (error) {
    objectUrls.forEach((url) => URL.revokeObjectURL(url));
    throw error;
  }
};
