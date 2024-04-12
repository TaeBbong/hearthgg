import 'package:flutter/material.dart';
import '../constants/area.dart';

class DesktopScreen extends StatefulWidget {
  final bool isDarkMode;
  final Function(bool) toggleTheme;

  const DesktopScreen(
      {super.key, required this.isDarkMode, required this.toggleTheme});

  @override
  _DesktopScreenState createState() => _DesktopScreenState();
}

class _DesktopScreenState extends State<DesktopScreen> {
  String area = '아시아태평양';
  TextEditingController battleTagController = TextEditingController();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: InkWell(
          child: const Text('HearthGG.web.app'),
          onTap: () {},
        ),
        centerTitle: false,
        actions: [
          Switch(
            value: widget.isDarkMode,
            onChanged: widget.toggleTheme,
            activeColor: Colors.blue,
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(8.0),
            child: Image.asset('images/main.png', width: 240),
          ),
          SizedBox(
            width: MediaQuery.of(context).size.width * 0.4,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                SizedBox(
                  width: MediaQuery.of(context).size.width * 0.1,
                  child: DropdownMenu<String>(
                    initialSelection: areas.keys.first,
                    onSelected: (String? value) {
                      setState(() {
                        area = value!;
                      });
                    },
                    dropdownMenuEntries: areas.keys
                        .toList()
                        .map<DropdownMenuEntry<String>>((String value) {
                      return DropdownMenuEntry<String>(
                        value: value,
                        label: value,
                      );
                    }).toList(),
                  ),
                ),
                SizedBox(
                  width: MediaQuery.of(context).size.width * 0.3,
                  child: TextFormField(
                    controller: battleTagController,
                    decoration: const InputDecoration(
                      labelText: '배틀태그를 입력하세요. (ex: Flurry)',
                      border: OutlineInputBorder(),
                      suffixIcon: Icon(Icons.search),
                    ),
                  ),
                ),
              ],
            ),
          ),
          Expanded(
              child: Container()), // Use expanded to push footer to the bottom
          Footer(),
        ],
      ),
    );
  }
}

class Footer extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.all(20),
      color: Theme.of(context)
          .primaryColor
          .withOpacity(0.1), // Slight primary color tint
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            'TaeBbong © 2024 My Website',
            style: TextStyle(
              fontSize: 16,
              color:
                  Theme.of(context).primaryColor, // Use primary color for text
            ),
          ),
        ],
      ),
    );
  }
}
