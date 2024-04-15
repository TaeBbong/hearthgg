import 'package:flutter/material.dart';

final ThemeData lightTheme = ThemeData(
  brightness: Brightness.light,
  primaryColor: Colors.indigoAccent,
  colorScheme: const ColorScheme.light(
    background: Colors.white,
    primary: Colors.indigoAccent,
    brightness: Brightness.light,
  ),
  scaffoldBackgroundColor: Colors.white,
);

final ThemeData darkTheme = ThemeData(
  brightness: Brightness.dark,
  primaryColor: Colors.indigoAccent,
  colorScheme: const ColorScheme.dark(
    background: Colors.black87,
    primary: Colors.indigoAccent,
    brightness: Brightness.dark,
  ),
  scaffoldBackgroundColor: Colors.black87,
);
