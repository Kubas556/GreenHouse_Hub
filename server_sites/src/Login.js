import React from "react";
import Grid from "@material-ui/core/Grid";
import Container from "@material-ui/core/Container";
import Paper from '@material-ui/core/Paper';
import Typography from "@material-ui/core/Typography";
import TextField from "@material-ui/core/TextField";
import Button from "@material-ui/core/Button";

export default function login() {
    return(
        <div>
            <Grid container direction={"row"} justify={"center"} alignItems={"center"} style={{minHeight:'100vh',position:'absolute'}}>
                <Container maxWidth="xs">
                    <Paper>
                        <form method={"post"}>
                            <Grid container direction={"column"} justify={"center"} alignItems={"center"} spacing={2}>
                                <Typography variant="h4">
                                    Login
                                </Typography>
                                <Grid item>
                                    <TextField
                                        fullWidth
                                        variant="outlined"
                                        label="email"
                                        type="text"
                                        name={"email"}
                                    />
                                </Grid>
                                <Grid item>
                                    <TextField
                                        fullWidth
                                        variant="outlined"
                                        label="Password"
                                        type="password"
                                        name={"password"}
                                    />
                                </Grid>
                                <Grid item>
                                    <input style={{display: "none"}} id={"submit-btn"} type={"submit"}/>
                                    <label htmlFor="submit-btn">
                                        <Button variant={"contained"} color={"primary"} component="span">Login</Button>
                                    </label>
                                </Grid>
                            </Grid>
                        </form>
                    </Paper>
                </Container>
            </Grid>
        </div>
    )
}