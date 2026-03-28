import * as React from "react";
import Box from "@mui/material/Box";
import { Player } from '../components/Player';

const FOOTER_HEIGHT = 84;

const OutmostBox = {
  width: '100%',
  minWidth: '100%',
  height: '100dvh',
  minHeight: '100vh',
  overflow: 'hidden',
};

const PlayerBox = {
  width: '100%',
  height: '100%',
  display: 'grid',
  boxSizing: 'border-box',
  p: { xs: 1, sm: 1.5, md: 2 },
  pb: `${FOOTER_HEIGHT}px`,
  gap: { xs: 1, md: 1.25 },
  gridTemplateColumns: {
    xs: '1fr',
    md: 'minmax(0, 1fr) clamp(300px, 32vw, 460px)',
  },
  gridTemplateRows: {
    xs: `auto auto minmax(0, 1fr) ${FOOTER_HEIGHT}px`,
    md: `auto minmax(0, 1fr) ${FOOTER_HEIGHT}px`,
  },
  gridTemplateAreas: {
    xs: `"search"
         "sidebar"
         "Lrc"
         "footer"`,
    md: `"Lrc search"
         "Lrc sidebar"
         "footer footer"`,
  },
};

interface PageLayoutProps {
  songList: any[] | null;
}

export default function PageLayout({ songList }: PageLayoutProps) {
  if (!songList) {
    return <h1>Loading...</h1>;
  }

  return (
    <Box sx={OutmostBox}>
      <Box sx={PlayerBox}>
        <Player songList={songList} />
      </Box>
    </Box>
  );
}
