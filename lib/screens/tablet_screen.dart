import 'package:flutter/material.dart';

class TabletScreen extends StatefulWidget {
  final bool isDarkMode;
  final Function(bool) toggleTheme;

  const TabletScreen(
      {super.key, required this.isDarkMode, required this.toggleTheme});

  @override
  _TabletScreenState createState() => _TabletScreenState();
}

class _TabletScreenState extends State<TabletScreen> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Flutter Theme Demo for Tablet'),
        actions: [
          Switch(
            value: widget.isDarkMode,
            onChanged: widget.toggleTheme,
            activeColor: Colors.blue,
          ),
        ],
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: FlutterLogo(size: 120), // Slightly larger logo for tablet
            ),
            Padding(
              padding: const EdgeInsets.all(24.0),
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
