import * as React from "react";
import Box from "@mui/material/Box";

import { makeStyles } from "@mui/styles";
import { Player } from '../components/Player'
import { ScrollBar } from "../styles/styles";
import { FavList } from '../components/FavList'


export default function PageLayout({ songList }) {

    if( !songList )
        return <h1>Loading...</h1>

    return (

        // Outest layer of the page
        <Box
            sx={{
                width: "100%",
                color: "#1234",
                "& > .MuiBox-root > .MuiBox-root": {
                    p: 1
                }
            }}
        >
            <Box // Grid Component
                style={{ height: "100vh", maxHeight: "100%" }}
                sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: 0,
                    gridTemplateRows: "72px 1fr",
                    gridTemplateAreas: `"Lrc         Lrc         search"
                                        "Lrc         Lrc         sidebar"
                                        "footer      footer      footer"`
                }}
            >
                <Player songList={songList}/>
            </Box>
        </Box>
    );
}
