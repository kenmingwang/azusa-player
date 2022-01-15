import { makeStyles } from "@mui/styles";

export const ScrollBar = makeStyles((theme) => ({
    root: {
        "&::-webkit-scrollbar": {
            width: "14px",
            height: "18px",
            background: "transparent"
        },

        "&::-webkit-scrollbar-thumb": {
            height: "29px",
            border: "5px solid rgba(0, 0, 0, 0)",
            backgroundClip: "padding-box",
            borderRadius: "7px",
            "-webkit-border-radius": "7px",
            backgroundColor: "#c6acfc"
        },
    },
}));
