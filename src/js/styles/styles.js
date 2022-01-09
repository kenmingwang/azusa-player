import { makeStyles } from "@mui/styles";

export const ScrollBar = makeStyles((theme) => ({
    root: {
        "&::-webkit-scrollbar": {
            width: "14px",
            height: "18px",
            background: "transparent"
        },

        "&::-webkit-scrollbar-thumb": {
            height: "49px",
            border: "5px solid rgba(0, 0, 0, 0)",
            backgroundClip: "padding-box",
            borderRadius: "7px",
            "-webkit-border-radius": "7px",
            backgroundColor: "#9370DB"
        },
    },
}));
