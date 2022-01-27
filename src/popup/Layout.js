import * as React from "react";
import Box from "@mui/material/Box";
import { Player } from '../components/Player'

const OutmostBox = {
    width: "100%",
    color: "#1234",
    "& > .MuiBox-root > .MuiBox-root": {
        p: 1
    }
}
const PlayerBox = {
    height: "100vh",
    maxHeight: "100%",
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 0,
    gridTemplateRows: "72px 1fr",
    gridTemplateAreas: `"Lrc         Lrc      Lrc      search"
                        "Lrc         Lrc      Lrc      sidebar"
                        "footer      footer   footer   footer"`
}

export default function PageLayout({ songList }) {

    if (!songList)
        return <h1>Loading...</h1>

    return (
        // Outmost layer of the page
        <Box sx={OutmostBox}>
            <Box sx={PlayerBox}> 
                <Player songList={songList} />
            </Box>
        </Box>
    );
}
