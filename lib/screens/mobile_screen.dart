import 'package:flutter/material.dart';

class MobileScreen extends StatelessWidget {
  final bool isDarkMode;
  final Function(bool) toggleTheme;

  const MobileScreen(
      {super.key, required this.isDarkMode, required this.toggleTheme});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Flutter Theme Demo for Mobile'),
        actions: [
          Switch(
            value: isDarkMode,
            onChanged: toggleTheme,
            activeColor: Colors.blue,
          ),
        ],
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(8.0),
              child: FlutterLogo(size: 80), // Smaller logo for mobile
            ),
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: TextFormField(
                decoration: InputDecoration(
                  labelText: 'Search',
                  border: OutlineInputBorder(),
                  suffixIcon: Icon(Icons.search),
                ),
              ),
            ),
            // Footer(),
          ],
        ),
      ),
    );
  }
}
