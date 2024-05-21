import 'package:flutter/material.dart';
import '../constants/color_scheme.dart';
import '../constants/text_styles.dart';

final ThemeData lightTheme = ThemeData(
  brightness: Brightness.light,
  colorScheme: newLightColor,
  textTheme: lightTextTheme,
);

final ThemeData darkTheme = ThemeData(
  brightness: Brightness.dark,
  colorScheme: newDarkColor,
  textTheme: darkTextTheme,
);
