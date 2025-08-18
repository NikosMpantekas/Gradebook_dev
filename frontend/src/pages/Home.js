import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { toggleDarkMode } from "../features/ui/uiSlice";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Stack,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import {
  Menu as MenuIcon,
  Brightness4 as Brightness4Icon,
  Brightness7 as Brightness7Icon,
  CheckCircle as CheckCircleIcon,
  Star as StarIcon,
  Message as MessageIcon,
  BarChart as BarChartIcon,
} from "@mui/icons-material";

const Logo = () => (
  <Button
    href="/home"
    sx={{
      textTransform: "none",
      p: 0,
      minWidth: 0,
      "&:hover": {
        bgcolor: "transparent",
        color: "#337ab7",
      },
    }}
  >
    <Box
      sx={{
        fontWeight: 100,
        fontSize: { xs: 28, sm: 32, md: 34, lg: 36 },
        color: "#337ab7",
        letterSpacing: 1,
        mr: 2,
        fontFamily: "Roboto, Arial, sans-serif",
      }}
    >
      GradeBook
    </Box>
  </Button>
);

const navLinks = [
  { label: "Πίνακας Ελέγχου", href: "/login" },
  { label: "Σχετικά με εμάς", href: "/about" },
  { label: "Επικοινωνία", href: "/contact" },
];

const DashboardMockup = () => (
  <Box
    sx={{
      width: "100%",
      maxWidth: 420,
      height: 260,
      mx: "auto",
      mt: { xs: 4, md: 0 },
      borderRadius: 4,
      bgcolor: "#23262b",
      boxShadow: "0 4px 24px 0 rgba(51,122,183,0.10)",
      display: "flex",
      alignItems: "stretch",
      justifyContent: "center",
      overflow: "hidden",
      position: "relative",
      p: 0,
      filter: "blur(0.5px)",
    }}
  >
    <Box
      sx={{
        width: 110,
        height: "100%",
        bgcolor: "#23262b",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        pt: 3,
        px: 2,
        gap: 2,
        borderRight: "1px solid #337ab7",
      }}
    >
      <Box
        sx={{
          width: "100%",
          height: 36,
          bgcolor: "#4a4a4a",
          borderRadius: 2,
          mb: 2,
        }}
      />
      <Box
        sx={{
          width: "100%",
          height: 36,
          bgcolor: "#4a4a4a",
          borderRadius: 2,
          mb: 1.5,
        }}
      />
      <Box
        sx={{
          width: "70%",
          height: 18,
          bgcolor: "#23262b",
          borderRadius: 2,
          mb: 1,
        }}
      />
      <Box
        sx={{
          width: "60%",
          height: 14,
          bgcolor: "#23262b",
          borderRadius: 2,
        }}
      />
    </Box>
    <Box
      sx={{
        flex: 1,
        height: "100%",
        bgcolor: "#23262b",
        p: 2.5,
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <Box
          sx={{
            width: 28,
            height: 28,
            bgcolor: "#337ab7",
            borderRadius: "50%",
          }}
        />
        <Box
          sx={{ width: 120, height: 16, bgcolor: "#4a4a4a", borderRadius: 2 }}
        />
        <Box sx={{ flex: 1 }} />
        <Box
          sx={{
            width: 22,
            height: 22,
            bgcolor: "#4a4a4a",
            borderRadius: "50%",
          }}
        />
        <Box
          sx={{
            width: 22,
            height: 22,
            bgcolor: "#4a4a4a",
            borderRadius: "50%",
          }}
        />
        <Box
          sx={{
            width: 22,
            height: 22,
            bgcolor: "#4a4a4a",
            borderRadius: "50%",
          }}
        />
      </Box>
      <Box
        sx={{
          width: 120,
          height: 18,
          bgcolor: "#4a4a4a",
          borderRadius: 2,
          mb: 1,
        }}
      />
      <Box
        sx={{
          width: 180,
          height: 14,
          bgcolor: "#4a4a4a",
          borderRadius: 2,
          mb: 2,
        }}
      />
      <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
        <Box
          sx={{ flex: 1, height: 60, bgcolor: "#181b20", borderRadius: 3 }}
        />
        <Box
          sx={{ flex: 1, height: 60, bgcolor: "#181b20", borderRadius: 3 }}
        />
      </Box>
      <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
        <Box
          sx={{
            flex: 1,
            height: 36,
            bgcolor: "#23262b",
            borderRadius: 2,
            border: "1px solid #337ab7",
          }}
        />
        <Box
          sx={{
            flex: 1,
            height: 36,
            bgcolor: "#23262b",
            borderRadius: 2,
            border: "1px solid #337ab7",
          }}
        />
        <Box
          sx={{
            flex: 1,
            height: 36,
            bgcolor: "#23262b",
            borderRadius: 2,
            border: "1px solid #337ab7",
          }}
        />
        <Box
          sx={{
            flex: 1,
            height: 36,
            bgcolor: "#23262b",
            borderRadius: 2,
            border: "1px solid #337ab7",
          }}
        />
      </Box>
    </Box>
  </Box>
);

export default function Home() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { darkMode } = useSelector((state) => state.ui);
  const dispatch = useDispatch();

  const handleDrawerToggle = () => setDrawerOpen((prev) => !prev);
  const handleToggleDarkMode = () => dispatch(toggleDarkMode());

  const colors = darkMode
    ? {
        background: "#181b20",
        appBar: "#23262b",
        card: "#23262b",
        text: "#fff",
        subText: "grey.300",
        footer: "#23262b",
        border: "1px solid #23262b",
        button: "#337ab7",
        buttonHover: "#245a8d",
        icon: "#337ab7",
      }
    : {
        background: "#f5f6fa",
        appBar: "#fff",
        card: "#fff",
        text: "#23262b",
        subText: "grey.800",
        footer: "#f5f6fa",
        border: "1px solid #e0e0e0",
        button: "#337ab7",
        buttonHover: "#245a8d",
        icon: "#337ab7",
      };

  const features = [
    {
      icon: <CheckCircleIcon sx={{ fontSize: 40, color: colors.icon }} />,
      title: "Παρουσίες",
      description: "Εύκολη καταγραφή παρουσιών μαθητών.",
    },
    {
      icon: <StarIcon sx={{ fontSize: 40, color: colors.icon }} />,
      title: "Βαθμολογίες",
      description: "Άμεση διαχείριση και ανάλυση βαθμών.",
    },
    {
      icon: <MessageIcon sx={{ fontSize: 40, color: colors.icon }} />,
      title: "Επικοινωνία",
      description: "Γρήγορη ενημέρωση γονέων & μαθητών.",
    },
    {
      icon: <BarChartIcon sx={{ fontSize: 40, color: colors.icon }} />,
      title: "Αναφορές",
      description: "Αναλυτικές αναφορές προόδου.",
    },
  ];

  return (
    <Box
      sx={{
        bgcolor: colors.background,
        minHeight: "100vh",
        fontFamily: "Roboto, Arial, sans-serif",
        display: "flex",
        flexDirection: "column",
        overflow: "auto",
        transition: 'background-color 0.1s',
        overscrollBehavior: 'none',
        overscrollColor: colors.icon,
      }}
    >
      <AppBar
        position="static"
        elevation={0}
        sx={{ bgcolor: colors.appBar, borderBottom: colors.border, transition: 'background-color 0.1s, border-bottom-color 0.1s' }}
      >
        <Toolbar sx={{ minHeight: 64, px: { xs: 1, sm: 3 } }}>
          <IconButton
            sx={{
              display: { xs: "flex", md: "none" },
              color: colors.icon,
              mr: 1,
              transition: 'color 0.1s',
            }}
            onClick={handleDrawerToggle}
            aria-label="menu"
          >
            <MenuIcon />
          </IconButton>
          <Logo />
          <Box sx={{ flexGrow: 1 }} />
          <Stack
            direction="row"
            spacing={2}
            sx={{ display: { xs: "none", md: "flex" } }}
          >
            {navLinks.map((link) => (
              <Button
                key={link.label}
                href={link.href}
                sx={{
                  color: colors.icon,
                  fontWeight: 500,
                  fontSize: 16,
                  borderRadius: 2,
                  px: 2,
                  textTransform: "none",
                  transition: 'color 0.1s, background-color 0.1s',
                  "&:hover": { bgcolor: colors.appBar },
                }}
              >
                {link.label}
              </Button>
            ))}
          </Stack>
          <IconButton
            onClick={handleToggleDarkMode}
            sx={{ color: colors.icon, ml: 2, transition: 'color 0.1s' }}
            aria-label="Toggle dark mode"
            title="Toggle dark mode"
          >
            {darkMode ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>
        </Toolbar>
      </AppBar>

      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true,
        }}
        PaperProps={{
          sx: {
            width: 220,
            bgcolor: colors.appBar,
            color: colors.text,
            boxShadow: 3,
            transition: 'background-color 0.1s, color 0.1s',
          },
        }}
      >
        <Box
          sx={{
            width: 220,
            pt: 2,
            px: 2,
            display: "flex",
            flexDirection: "column",
            height: "100%",
            bgcolor: colors.appBar,
            color: colors.text,
            transition: 'background-color 0.1s, color 0.1s',
          }}
          role="presentation"
          onClick={handleDrawerToggle}
          onKeyDown={handleDrawerToggle}
        >
          <List sx={{ mt: 2 }}>
            {navLinks.map((link) => (
              <ListItem key={link.label} disablePadding>
                <ListItemButton
                  component="a"
                  href={link.href}
                  sx={{ color: colors.text, transition: 'color 0.1s' }}
                >
                  <ListItemText primary={link.label} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
        <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
          <Grid
            container
            spacing={6}
            alignItems="center"
            justifyContent="center"
          >
            <Grid item xs={12} md={6}>
              <Box sx={{ mb: 4 }}>
                <Typography
                  variant="h3"
                  fontWeight="bold"
                  sx={{
                    color: colors.text,
                    mb: 2,
                    fontSize: { xs: 28, md: 36 },
                    lineHeight: 1.2,
                  }}
                >
                  Αναβαθμίστε την διαχείριση του φροντιστηρίου σας.
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    color: colors.subText,
                    mb: 4,
                    fontWeight: 400,
                    fontSize: { xs: 16, md: 18 },
                  }}
                >
                  Το GradeBook παρέχει τα εφόδια για την σύγχρονη και εύκολη
                  διαχείριση φροντιστηρίων, προσφέροντας πλήρη έλεγχο των τάξεων
                  και των μαθητών σας.
                </Typography>
                <Button
                  variant="contained"
                  size="large"
                  href="/login"
                  sx={{
                    bgcolor: colors.button,
                    color: "white",
                    borderRadius: 8,
                    px: 5,
                    py: 1.7,
                    fontWeight: "bold",
                    fontSize: 18,
                    boxShadow: "0 2px 8px 0 rgba(51,122,183,0.10)",
                    textTransform: "none",
                    transition: "all 0.2s",
                    "&:hover": {
                      bgcolor: colors.buttonHover,
                      transform: "translateY(-2px) scale(1.03)",
                    },
                  }}
                  rel="noopener noreferrer"
                >
                  Συνδεθείτε στον Πίνακα Ελέγχου
                </Button>
              </Box>
              <Grid container spacing={2} id="features">
                {features.map((feature, idx) => (
                  <Grid item xs={12} sm={6} key={idx}>
                    <Card
                      elevation={0}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                        p: 2,
                        borderRadius: 4,
                        bgcolor: colors.card,
                        transition: 'background-color 0.1s, color 0.1s',
                        boxShadow: "0 1px 6px 0 rgba(51,122,183,0.04)",
                        mb: 1,
                        transition: "box-shadow 0.2s",
                        "&:hover": {
                          boxShadow: "0 4px 16px 0 rgba(51,122,183,0.10)",
                        },
                      }}
                    >
                      {React.cloneElement(feature.icon, { sx: { fontSize: 32, color: colors.icon } })}
                      <Box>
                        <Typography
                          variant="subtitle1"
                          fontWeight="bold"
                          sx={{ color: colors.text, transition: 'color 0.1s' }}
                        >
                          {feature.title}
                        </Typography>
                        <Typography variant="body2" sx={{ color: colors.subText, transition: 'color 0.1s' }}>
                          {feature.description}
                        </Typography>
                      </Box>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Grid>
            <Grid
              item
              xs={12}
              md={6}
              sx={{
                display: { xs: "none", md: "flex" },
                justifyContent: "center",
              }}
            >
              <DashboardMockup />
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Box
        sx={{
          mt: "auto",
          py: 3,
          bgcolor: colors.footer,
          borderTop: colors.border,
          textAlign: "center",
          transition: 'background-color 0.1s, border-top-color 0.1s',
        }}
      >
        <Typography variant="body2" sx={{ color: darkMode ? "grey.400" : "grey.700", transition: 'color 0.1s' }}>
          © {new Date().getFullYear()} GradeBook Team.
        </Typography>
      </Box>
    </Box>
  );
}