import 'package:flutter/material.dart';

import '../widgets/responsive_layout.dart';
import 'desktop_screen.dart';
import 'mobile_screen.dart';
import 'tablet_screen.dart';

class HomeScreen extends StatelessWidget {
  final bool isDarkMode;
  final Function(bool) toggleTheme;

  const HomeScreen(
      {super.key, required this.isDarkMode, required this.toggleTheme});

  @override
  Widget build(BuildContext context) {
    return ResponsiveLayout(
      mobileLayout: MobileScreen(
        isDarkMode: isDarkMode,
        toggleTheme: toggleTheme,
      ),
      tabletLayout: TabletScreen(
        isDarkMode: isDarkMode,
        toggleTheme: toggleTheme,
      ),
      desktopLayout: DesktopScreen(
        isDarkMode: isDarkMode,
        toggleTheme: toggleTheme,
      ),
    );
  }
}
