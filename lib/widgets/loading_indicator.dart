import 'package:flutter/material.dart';

class LoadingIndicator extends StatelessWidget {
  const LoadingIndicator({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(15),
      height: 150,
      width: 150,
      child: const CircularProgressIndicator(
        strokeWidth: 15,
      ),
    );
  }
}
