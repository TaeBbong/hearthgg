import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../constants/mode.dart';
import '../controllers/home_controller.dart';

class ModeIndicator extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return GetBuilder<HomeController>(builder: (controller) {
      return Container(
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: ModeLabel.values
              .map((mode) => TextButton(
                    onPressed: () => controller.updateMode(mode),
                    child: Text(mode.text),
                    style: mode == controller.selectedMode
                        ? buttonStyle
                        : buttonStyle2,
                  ))
              .toList(),
        ),
      );
    });
  }
}

final ButtonStyle buttonStyle =
    TextButton.styleFrom(backgroundColor: Colors.red);
final ButtonStyle buttonStyle2 =
    TextButton.styleFrom(backgroundColor: Colors.yellow);
