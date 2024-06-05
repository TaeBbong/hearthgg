import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../constants/mode.dart';
import '../controllers/home_controller.dart';

class ModeIndicator extends StatelessWidget {
  const ModeIndicator({super.key});

  @override
  Widget build(BuildContext context) {
    final ButtonStyle selectedButton = OutlinedButton.styleFrom(
      backgroundColor: Theme.of(context).colorScheme.primary,
      textStyle:
          Theme.of(context).textTheme.bodyLarge!.copyWith(color: Colors.white),
    );
    final ButtonStyle unSelectedButton = OutlinedButton.styleFrom(
      textStyle:
          Theme.of(context).textTheme.bodyLarge!.copyWith(color: Colors.white),
    );
    return GetBuilder<HomeController>(builder: (controller) {
      return Container(
        padding: const EdgeInsets.all(10),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: ModeLabel.values
              .map((mode) => mode == controller.selectedMode
                  ? ElevatedButton(
                      onPressed: () => controller.updateMode(mode),
                      style: selectedButton,
                      child: Text(mode.text))
                  : OutlinedButton(
                      onPressed: () => controller.updateMode(mode),
                      style: unSelectedButton,
                      child: Text(mode.text),
                    ))
              .toList(),
        ),
      );
    });
  }
}
