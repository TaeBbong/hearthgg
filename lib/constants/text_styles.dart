import 'package:flutter/material.dart';

const TextTheme lightTextTheme = TextTheme(
  titleLarge: TextStyle(
      fontSize: 45, fontFamily: 'Queensides', fontWeight: FontWeight.bold),
  bodyLarge: TextStyle(fontSize: 18, fontFamily: 'Pretendard'),
  bodyMedium: TextStyle(
    fontSize: 16,
    fontFamily: 'Pretendard',
    color: Colors.black54,
  ),
  bodySmall: TextStyle(
    fontSize: 14,
    fontFamily: 'Pretendard',
    color: Colors.black54,
  ),
);

const TextTheme darkTextTheme = TextTheme(
  titleLarge: TextStyle(
      fontSize: 45, fontFamily: 'Queensides', fontWeight: FontWeight.bold),
  bodyLarge: TextStyle(fontSize: 18, fontFamily: 'Pretendard'),
  bodyMedium: TextStyle(
    fontSize: 16,
    fontFamily: 'Pretendard',
    color: Colors.grey,
  ),
  bodySmall: TextStyle(
    fontSize: 14,
    fontFamily: 'Pretendard',
    color: Colors.grey,
  ),
);
