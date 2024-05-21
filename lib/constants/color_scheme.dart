import 'package:flutter/material.dart';

final newLightColor = ColorScheme.fromSeed(
  seedColor: Color(0xff000e27),
  brightness: Brightness.light,
);

final newDarkColor = ColorScheme.fromSeed(
  seedColor: Color(0xff000e27),
  brightness: Brightness.dark,
);

const lightColor = ColorScheme.light(
  background: Colors.white,
  primary: Color(0xff000e27),
  secondary: Color(0xff000e27),
  brightness: Brightness.light,
);

const darkColor = ColorScheme.dark(
  background: Colors.black54,
  primary: Color(0xff000e27),
  secondary: Colors.lightBlue,
  brightness: Brightness.dark,
);
